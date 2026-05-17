import { useState, useEffect } from 'react'
import type { ConnectionConfig } from '../types'

interface ConnectionPanelProps {
  connected: boolean
  onConnect: (cfg: ConnectionConfig) => void
  onDisconnect: () => void
}

export default function ConnectionPanel({ connected, onConnect, onDisconnect }: ConnectionPanelProps) {
  const [type, setType] = useState<'serial' | 'udp'>('udp')
  const [ports, setPorts] = useState<Array<{ path: string; manufacturer?: string }>>([])
  const [port, setPort] = useState('')
  const [baudRate, setBaudRate] = useState(57600)
  const [udpPort, setUdpPort] = useState(14550)
  const [udpHost, setUdpHost] = useState('0.0.0.0')
  const [encKey, setEncKey] = useState('')
  const [encKeyError, setEncKeyError] = useState('')

  const refreshPorts = async () => {
    const list = await window.gcs.listPorts()
    setPorts(list)
    if (list.length > 0 && !port) setPort(list[0].path)
  }

  useEffect(() => {
    refreshPorts()
  }, [])

  const handleConnect = () => {
    const trimmedKey = encKey.trim()
    if (trimmedKey && !/^[0-9a-fA-F]{64}$/.test(trimmedKey)) {
      setEncKeyError('64 hex karakter olmalı (256-bit)')
      return
    }
    setEncKeyError('')
    const encryption = trimmedKey || undefined
    if (type === 'serial') {
      onConnect({ type: 'serial', port, baudRate, encryptionKey: encryption })
    } else {
      onConnect({ type: 'udp', udpPort, udpHost, encryptionKey: encryption })
    }
  }

  const inputStyle: React.CSSProperties = {
    background: '#0a0f1a',
    border: '1px solid #1a2030',
    color: '#e8e8e8',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '4px 8px',
    width: '100%',
    outline: 'none',
    borderRadius: 2,
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#6b7280',
    letterSpacing: '0.15em',
    marginBottom: 3,
    display: 'block',
  }

  return (
    <div style={{ padding: '10px 12px' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#6b7280', letterSpacing: '0.25em', marginBottom: 10 }}>
        // BAĞLANTI
      </div>

      {/* Type toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['udp', 'serial'] as const).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            style={{
              flex: 1, fontFamily: 'monospace', fontSize: 11, padding: '5px 0',
              background: type === t ? '#00d4ff' : '#0a0f1a',
              color: type === t ? '#050508' : '#6b7280',
              border: `1px solid ${type === t ? '#00d4ff' : '#1a2030'}`,
              cursor: 'pointer', fontWeight: 'bold', borderRadius: 2,
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {type === 'serial' ? (
        <>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>PORT</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={port} onChange={e => setPort(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                {ports.map(p => (
                  <option key={p.path} value={p.path}>{p.path}{p.manufacturer ? ` (${p.manufacturer})` : ''}</option>
                ))}
                {ports.length === 0 && <option value="">Port bulunamadı</option>}
              </select>
              <button onClick={refreshPorts} style={{
                background: '#0a0f1a', border: '1px solid #1a2030', color: '#00d4ff',
                fontFamily: 'monospace', fontSize: 11, padding: '0 8px', cursor: 'pointer', borderRadius: 2,
              }}>↻</button>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>BAUD RATE</label>
            <select value={baudRate} onChange={e => setBaudRate(Number(e.target.value))} style={inputStyle}>
              {[9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>UDP HOST</label>
            <input
              type="text" value={udpHost} onChange={e => setUdpHost(e.target.value)}
              style={inputStyle} placeholder="0.0.0.0"
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>UDP PORT</label>
            <input
              type="number" value={udpPort} onChange={e => setUdpPort(Number(e.target.value))}
              style={inputStyle} placeholder="14550"
            />
          </div>
        </>
      )}

      <button
        onClick={connected ? onDisconnect : handleConnect}
        style={{
          width: '100%', fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold',
          padding: '8px 0', cursor: 'pointer', borderRadius: 2,
          background: connected ? '#ff4d00' : '#00d4ff',
          color: '#050508', border: 'none', letterSpacing: '0.1em',
        }}
      >
        {connected ? '■ KES' : '▶ BAĞLAN'}
      </button>

      <div style={{
        marginTop: 10, padding: '5px 8px', fontFamily: 'monospace', fontSize: 10,
        background: '#0a0f1a', border: `1px solid ${connected ? '#00ff88' : '#1a2030'}`,
        color: connected ? '#00ff88' : '#6b7280', textAlign: 'center',
      }}>
        {connected ? '● BAĞLI' : '○ BAĞLI DEĞİL'}
      </div>

      {/* AES-256 Encryption Key */}
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>AES-256 ŞİFRELEME ANAHTARI <span style={{ color: '#4a5a70' }}>(isteğie bağlı)</span></label>
        <input
          type="text"
          value={encKey}
          onChange={e => { setEncKey(e.target.value); setEncKeyError('') }}
          placeholder="0000...0000 (64 hex karakter)"
          maxLength={64}
          style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.05em', color: encKey ? '#00d4ff' : '#4a5a70' }}
        />
        {encKeyError && <div style={{ color: '#ff4d00', fontSize: 9, marginTop: 2 }}>{encKeyError}</div>}
        {encKey.length > 0 && !encKeyError && (
          <div style={{ color: encKey.length === 64 ? '#00ff88' : '#ff4d00', fontSize: 9, marginTop: 2 }}>
            {encKey.length}/64 {encKey.length === 64 ? '✓ AES-256 aktif' : 'karakter eksik'}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, padding: '8px', background: '#0a0f1a', border: '1px solid #1a2030', fontFamily: 'monospace', fontSize: 9, color: '#6b7280', lineHeight: 1.6 }}>
        <div style={{ color: '#00d4ff', marginBottom: 4 }}>SITL TESTİ:</div>
        ArduPilot SITL başlat<br/>
        UDP 14550 kullan<br/><br/>
        <div style={{ color: '#00d4ff', marginBottom: 4 }}>DONANIM:</div>
        FC'yi USB/serial ile bağla<br/>
        Tipik: 57600 baud
      </div>
    </div>
  )
}
