import { EventEmitter } from 'events'
import { createCipheriv, createDecipheriv } from 'crypto'
import { SerialPort } from 'serialport'
import * as dgram from 'dgram'
import type { WebContents } from 'electron'

// ─── CRC-16/MCRF4XX ────────────────────────────────────────────────────────
function updateCrc(crc: number, byte: number): number {
  let tmp = (byte ^ crc) & 0xff
  tmp ^= (tmp << 4) & 0xff
  return ((crc >> 8) ^ (tmp << 8) ^ (tmp << 3) ^ (tmp >> 4)) & 0xffff
}
function crc16(data: Buffer, extra?: number): number {
  let crc = 0xffff
  for (const b of data) crc = updateCrc(crc, b)
  if (extra !== undefined) crc = updateCrc(crc, extra)
  return crc
}

// CRC extra byte per message ID (from MAVLink spec)
const CRC_EXTRA: Record<number, number> = {
  0: 50,    // HEARTBEAT
  1: 124,   // SYS_STATUS
  24: 24,   // GPS_RAW_INT
  30: 39,   // ATTITUDE
  33: 104,  // GLOBAL_POSITION_INT
  39: 254,  // MISSION_ITEM
  40: 230,  // MISSION_REQUEST
  44: 221,  // MISSION_COUNT
  47: 153,  // MISSION_ACK
  74: 20,   // VFR_HUD
  253: 83,  // STATUSTEXT
}

// ─── Packet stream parser ───────────────────────────────────────────────────
interface ParsedPacket { msgId: number; sysId: number; payload: Buffer }

class StreamParser {
  private buf = Buffer.alloc(0)

  feed(data: Buffer): ParsedPacket[] {
    this.buf = Buffer.concat([this.buf, data])
    const out: ParsedPacket[] = []

    while (this.buf.length >= 8) {
      // Find STX
      let start = -1
      for (let i = 0; i < this.buf.length; i++) {
        if (this.buf[i] === 0xfe || this.buf[i] === 0xfd) { start = i; break }
      }
      if (start === -1) { this.buf = Buffer.alloc(0); break }
      if (start > 0) this.buf = this.buf.slice(start)

      const isV2 = this.buf[0] === 0xfd
      const minLen = isV2 ? 12 : 8
      if (this.buf.length < minLen) break

      const payLen = this.buf[1]
      const pktLen = payLen + minLen
      if (this.buf.length < pktLen) break

      const pkt = this.buf.slice(0, pktLen)
      this.buf = this.buf.slice(pktLen)

      const parsed = isV2 ? this.parseV2(pkt) : this.parseV1(pkt)
      if (parsed) out.push(parsed)
    }

    // Safety valve — prevent unbounded growth
    if (this.buf.length > 1024) this.buf = Buffer.alloc(0)
    return out
  }

  private parseV1(buf: Buffer): ParsedPacket | null {
    const payLen = buf[1]
    const msgId = buf[5]
    const payload = buf.slice(6, 6 + payLen)
    const crcData = buf.slice(1, 6 + payLen)
    const expected = crc16(crcData, CRC_EXTRA[msgId])
    const actual = buf.readUInt16LE(6 + payLen)
    if (expected !== actual) return null
    return { msgId, sysId: buf[3], payload }
  }

  private parseV2(buf: Buffer): ParsedPacket | null {
    const payLen = buf[1]
    if (buf[2] & 0x01) return null // signed — skip
    const msgId = buf[7] | (buf[8] << 8) | (buf[9] << 16)
    const payload = buf.slice(10, 10 + payLen)
    const crcData = buf.slice(1, 10 + payLen)
    const expected = crc16(crcData, CRC_EXTRA[msgId])
    const actual = buf.readUInt16LE(10 + payLen)
    if (expected !== actual) return null
    return { msgId, sysId: buf[4], payload }
  }
}

// ─── Packet builder ─────────────────────────────────────────────────────────
let _seq = 0
function buildV1(msgId: number, payload: Buffer, sysId = 255, compId = 190): Buffer {
  const seq = (_seq++) & 0xff
  const hdr = Buffer.from([0xfe, payload.length, seq, sysId, compId, msgId & 0xff])
  const crcData = Buffer.concat([hdr.slice(1), payload])
  const crc = crc16(crcData, CRC_EXTRA[msgId] ?? 0)
  const crcBuf = Buffer.alloc(2)
  crcBuf.writeUInt16LE(crc, 0)
  return Buffer.concat([hdr, payload, crcBuf])
}

// ─── MAVLink manager ────────────────────────────────────────────────────────
export interface TelemetryUpdate {
  lat?: number; lng?: number
  altitude?: number; relAltitude?: number
  airspeed?: number; groundspeed?: number
  heading?: number; roll?: number; pitch?: number; yaw?: number
  battVoltage?: number; battCurrent?: number; battRemaining?: number
  gpsFixType?: number; gpsSats?: number
  armed?: boolean; flightMode?: string
  connected?: boolean; climb?: number; throttle?: number
}

export class MavLinkManager extends EventEmitter {
  private serial: SerialPort | null = null
  private udp: dgram.Socket | null = null
  private parser = new StreamParser()
  private webContents: WebContents | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private uploadQueue: Array<{seq: number, lat: number, lng: number, alt: number}> = []
  private uploadTotal = 0

  // ── AES-256-CTR encryption ──────────────────────────────────────────────
  private encKey: Buffer | null = null
  private encCounter = 0

  setEncryptionKey(hexKey: string): void {
    if (!hexKey || hexKey.length === 0) { this.encKey = null; return }
    if (hexKey.length !== 64) throw new Error('AES key must be 64 hex chars (256-bit)')
    this.encKey = Buffer.from(hexKey, 'hex')
    this.encCounter = 0
    this.log(6, `AES-256 şifreleme aktif`)
  }

  private encryptFrame(data: Buffer): Buffer {
    if (!this.encKey) return data
    // 16-byte IV: first 8 bytes = counter (big-endian), last 8 bytes = 'XIHA' magic
    const iv = Buffer.alloc(16, 0)
    iv.writeBigUInt64BE(BigInt(this.encCounter++), 0)
    iv.write('XIHA1337', 8, 'ascii')
    const cipher = createCipheriv('aes-256-ctr', this.encKey, iv)
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
    return Buffer.concat([iv, encrypted])
  }

  private decryptFrame(data: Buffer): Buffer {
    if (!this.encKey || data.length <= 16) return data
    const iv = data.subarray(0, 16)
    const decipher = createDecipheriv('aes-256-ctr', this.encKey, iv)
    return Buffer.concat([decipher.update(data.subarray(16)), decipher.final()])
  }

  setWebContents(wc: WebContents) { this.webContents = wc }

  // ── serial port list ──────────────────────────────────────────────────────
  async listPorts(): Promise<Array<{path: string, manufacturer?: string}>> {
    const list = await SerialPort.list()
    return list.map(p => ({ path: p.path, manufacturer: p.manufacturer }))
  }

  // ── connect serial ────────────────────────────────────────────────────────
  connectSerial(port: string, baudRate = 57600, encryptionKey?: string): void {
    this.disconnect()
    this.parser = new StreamParser()
    if (encryptionKey) this.setEncryptionKey(encryptionKey)
    this.serial = new SerialPort({ path: port, baudRate, autoOpen: true })
    this.serial.on('data', (data: Buffer) => this.onData(data))
    this.serial.on('open', () => {
      this.push({ connected: true })
      this.log(6, `Serial ${port} @ ${baudRate} açıldı`)
      this.startHeartbeat()
    })
    this.serial.on('error', (err) => {
      this.log(3, `Serial hata: ${err.message}`)
      this.push({ connected: false })
    })
    this.serial.on('close', () => {
      this.push({ connected: false })
      this.log(5, 'Serial bağlantı kesildi')
    })
  }

  // ── connect UDP ───────────────────────────────────────────────────────────
  connectUdp(port = 14550, host = '0.0.0.0', encryptionKey?: string): void {
    this.disconnect()
    this.parser = new StreamParser()
    if (encryptionKey) this.setEncryptionKey(encryptionKey)
    this.udp = dgram.createSocket('udp4')
    this.udp.bind(port, host)
    this.udp.on('listening', () => {
      this.push({ connected: true })
      this.log(6, `UDP dinleniyor: ${host}:${port}`)
      this.startHeartbeat()
    })
    this.udp.on('message', (msg: Buffer) => this.onData(msg))
    this.udp.on('error', (err) => {
      this.log(3, `UDP hata: ${err.message}`)
      this.push({ connected: false })
    })
  }

  disconnect(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null }
    if (this.serial?.isOpen) this.serial.close()
    this.serial = null
    if (this.udp) { try { this.udp.close() } catch {} }
    this.udp = null
    this.push({ connected: false })
    this.log(6, 'Bağlantı kesildi')
  }

  // ── mission upload ────────────────────────────────────────────────────────
  uploadMission(waypoints: Array<{lat: number, lng: number, alt: number}>): void {
    this.uploadQueue = waypoints.map((wp, i) => ({ seq: i, ...wp }))
    this.uploadTotal = waypoints.length
    this.sendMissionCount(waypoints.length)
    this.log(6, `Görev yükleniyor: ${waypoints.length} waypoint`)
  }

  // ── internal ──────────────────────────────────────────────────────────────
  private onData(data: Buffer): void {
    const decrypted = this.decryptFrame(data)
    const packets = this.parser.feed(decrypted)
    for (const pkt of packets) this.handlePacket(pkt)
  }

  private handlePacket({ msgId, payload }: ParsedPacket): void {
    switch (msgId) {
      case 0:  this.handleHeartbeat(payload); break
      case 1:  this.handleSysStatus(payload); break
      case 24: this.handleGpsRaw(payload); break
      case 30: this.handleAttitude(payload); break
      case 33: this.handleGlobalPos(payload); break
      case 40: this.handleMissionRequest(payload); break
      case 47: this.handleMissionAck(payload); break
      case 74: this.handleVfrHud(payload); break
      case 253: this.handleStatusText(payload); break
    }
  }

  private handleHeartbeat(p: Buffer): void {
    if (p.length < 9) return
    const baseMode = p[6]
    const armed = !!(baseMode & 0x80)
    // Custom mode mapping (ArduPilot plane)
    const customMode = p.readUInt32LE(0)
    const modeMap: Record<number, string> = {
      0: 'MANUAL', 1: 'CIRCLE', 2: 'STABILIZE', 3: 'TRAINING', 4: 'ACRO',
      5: 'FBWA', 6: 'FBWB', 7: 'CRUISE', 8: 'AUTOTUNE', 10: 'AUTO',
      11: 'RTL', 12: 'LOITER', 13: 'TAKEOFF', 15: 'GUIDED', 17: 'QSTABILIZE',
      18: 'QHOVER', 19: 'QLOITER', 20: 'QLAND', 21: 'QRTL',
    }
    this.push({ armed, flightMode: modeMap[customMode] ?? `MODE${customMode}` })
  }

  private handleSysStatus(p: Buffer): void {
    if (p.length < 31) return
    this.push({
      battVoltage: p.readUInt16LE(14) / 1000,
      battCurrent: p.readInt16LE(16) / 100,
      battRemaining: p.readInt8(30),
    })
  }

  private handleGpsRaw(p: Buffer): void {
    if (p.length < 30) return
    this.push({ gpsFixType: p[28], gpsSats: p[29] })
  }

  private handleAttitude(p: Buffer): void {
    if (p.length < 28) return
    const r = 180 / Math.PI
    this.push({
      roll:  p.readFloatLE(4) * r,
      pitch: p.readFloatLE(8) * r,
      yaw:   p.readFloatLE(12) * r,
    })
  }

  private handleGlobalPos(p: Buffer): void {
    if (p.length < 28) return
    const hdgRaw = p.readUInt16LE(26)
    this.push({
      lat: p.readInt32LE(4) / 1e7,
      lng: p.readInt32LE(8) / 1e7,
      altitude: p.readInt32LE(12) / 1000,
      relAltitude: p.readInt32LE(16) / 1000,
      heading: hdgRaw === 0xffff ? 0 : hdgRaw / 100,
    })
  }

  private handleVfrHud(p: Buffer): void {
    if (p.length < 20) return
    this.push({
      airspeed: p.readFloatLE(0),
      groundspeed: p.readFloatLE(4),
      altitude: p.readFloatLE(8),
      climb: p.readFloatLE(12),
      heading: p.readInt16LE(16),
      throttle: p.readUInt16LE(18),
    })
  }

  private handleMissionRequest(p: Buffer): void {
    if (p.length < 4 || this.uploadQueue.length === 0) return
    const seq = p.readUInt16LE(0)
    const wp = this.uploadQueue.find(w => w.seq === seq)
    if (wp) {
      this.sendMissionItem(wp.seq, wp.lat, wp.lng, wp.alt, seq === 0)
      this.log(6, `WP-${seq.toString().padStart(2,'0')} gönderildi`)
    }
  }

  private handleMissionAck(p: Buffer): void {
    if (p.length < 3) return
    const type = p[2]
    if (type === 0) this.log(6, `✓ Görev yüklendi (${this.uploadTotal} waypoint)`)
    else this.log(4, `Görev yükleme hatası: ${type}`)
    this.uploadQueue = []
  }

  private handleStatusText(p: Buffer): void {
    if (p.length < 51) return
    const severity = p[0]
    const text = p.slice(1, 51).toString('utf8').replace(/\0/g, '').trim()
    this.log(severity, text, 'mavlink')
  }

  // ── senders ───────────────────────────────────────────────────────────────
  private send(buf: Buffer): void {
    const out = this.encryptFrame(buf)
    if (this.serial?.isOpen) this.serial.write(out)
    // UDP: would need remote addr; skip for now (GCS only listens)
  }

  private sendMissionCount(count: number): void {
    const pay = Buffer.alloc(4)
    pay.writeUInt16LE(count, 0)
    pay[2] = 1  // target_system
    pay[3] = 1  // target_component
    this.send(buildV1(44, pay))
  }

  private sendMissionItem(seq: number, lat: number, lng: number, alt: number, current: boolean): void {
    const pay = Buffer.alloc(37)
    pay.writeFloatLE(0, 0)   // param1
    pay.writeFloatLE(0, 4)   // param2
    pay.writeFloatLE(0, 8)   // param3
    pay.writeFloatLE(0, 12)  // param4
    pay.writeFloatLE(lat, 16)  // x (lat)
    pay.writeFloatLE(lng, 20)  // y (lng)
    pay.writeFloatLE(alt, 24)  // z (alt)
    pay.writeUInt16LE(seq, 28)
    pay.writeUInt16LE(16, 30)  // MAV_CMD_NAV_WAYPOINT
    pay[32] = 1  // target_system
    pay[33] = 1  // target_component
    pay[34] = 3  // MAV_FRAME_GLOBAL_RELATIVE_ALT
    pay[35] = current ? 1 : 0
    pay[36] = 1  // autocontinue
    this.send(buildV1(39, pay))
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const pay = Buffer.alloc(9)
      pay.writeUInt32LE(0, 0)  // custom_mode
      pay[4] = 6   // MAV_TYPE_GCS
      pay[5] = 8   // MAV_AUTOPILOT_INVALID
      pay[6] = 0   // base_mode
      pay[7] = 0   // system_status
      pay[8] = 3   // mavlink_version
      this.send(buildV1(0, pay))
    }, 1000)
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  private push(update: TelemetryUpdate): void {
    this.webContents?.send('mavlink:telemetry', update)
  }

  private log(severity: number, text: string, source: 'system' | 'mavlink' = 'system'): void {
    this.webContents?.send('mavlink:message', { severity, text, source })
  }
}
