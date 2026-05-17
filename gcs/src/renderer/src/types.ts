export interface Telemetry {
  lat: number
  lng: number
  altitude: number      // MSL (m)
  relAltitude: number   // AGL (m)
  airspeed: number      // m/s
  groundspeed: number   // m/s
  heading: number       // degrees 0-359
  roll: number          // degrees
  pitch: number         // degrees
  yaw: number           // degrees
  battVoltage: number   // V
  battCurrent: number   // A
  battRemaining: number // %
  gpsFixType: number    // 0=nofix 2=2D 3=3D 4=DGPS 6=RTK
  gpsSats: number
  armed: boolean
  flightMode: string
  connected: boolean
  climb: number         // m/s
  throttle: number      // %
}

export interface WaypointItem {
  seq: number
  lat: number
  lng: number
  alt: number
  command: number       // MAV_CMD
  frame: number         // MAV_FRAME
  current: number
  autocontinue: number
  param1: number
  param2: number
  param3: number
  param4: number
}

export interface ConnectionConfig {
  type: 'serial' | 'udp'
  port?: string
  baudRate?: number
  udpPort?: number
  udpHost?: string
  encryptionKey?: string  // 64 hex chars = 256-bit AES key
}

// ── AI Detection ─────────────────────────────────────────────────────────────
export interface DetectionResult {
  classId: number
  className: string
  confidence: number
  bbox: [number, number, number, number]  // x1, y1, x2, y2 (pixel coords on video)
}

export interface AIState {
  running: boolean
  fps: number
  modelLoaded: boolean
  detections: DetectionResult[]
  inferenceMs: number
}

export interface MessageLog {
  id: number
  time: string
  severity: number   // MAV_SEVERITY (0=EMERGENCY, 6=INFO, 7=DEBUG)
  text: string
  source: 'system' | 'mavlink'
}

export const GPS_FIX_LABELS: Record<number, string> = {
  0: 'NO GPS',
  1: 'NO FIX',
  2: '2D FIX',
  3: '3D FIX',
  4: 'DGPS',
  5: 'RTK FLOAT',
  6: 'RTK FIXED',
}

export const SEV_COLORS: Record<number, string> = {
  0: '#ff0000', // EMERGENCY
  1: '#ff4d00', // ALERT
  2: '#ff4d00', // CRITICAL
  3: '#ff4d00', // ERROR
  4: '#ffaa00', // WARNING
  5: '#ffaa00', // NOTICE
  6: '#00d4ff', // INFO
  7: '#6b7280', // DEBUG
}

export const DEFAULT_TELEMETRY: Telemetry = {
  lat: 0, lng: 0, altitude: 0, relAltitude: 0,
  airspeed: 0, groundspeed: 0, heading: 0,
  roll: 0, pitch: 0, yaw: 0,
  battVoltage: 0, battCurrent: 0, battRemaining: -1,
  gpsFixType: 0, gpsSats: 0,
  armed: false, flightMode: 'UNKNOWN',
  connected: false, climb: 0, throttle: 0,
}
