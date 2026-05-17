import { useState, useEffect, useCallback, useRef } from 'react'
import MapView from './components/MapView'
import HUD from './components/HUD'
import ConnectionPanel from './components/ConnectionPanel'
import MissionPanel from './components/MissionPanel'
import Console from './components/Console'
import CameraFeed from './components/CameraFeed'
import type { Telemetry, WaypointItem, ConnectionConfig, MessageLog } from './types'
import { DEFAULT_TELEMETRY } from './types'

type Tab = 'connection' | 'mission' | 'console' | 'camera'

let msgCounter = 0

function App(): React.JSX.Element {
  const [tel, setTel] = useState<Telemetry>({ ...DEFAULT_TELEMETRY })
  const [waypoints, setWaypoints] = useState<WaypointItem[]>([])
  const [messages, setMessages] = useState<MessageLog[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('connection')
  const telRef = useRef<Telemetry>({ ...DEFAULT_TELEMETRY })

  // Merge incoming telemetry
  const handleTelemetry = useCallback((data: unknown) => {
    const update = data as Partial<Telemetry>
    telRef.current = { ...telRef.current, ...update }
    setTel(prev => ({ ...prev, ...update }))
  }, [])

  const handleMessage = useCallback((msg: unknown) => {
    const m = msg as { severity: number; text: string; source: 'system' | 'mavlink' }
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    const entry: MessageLog = { id: ++msgCounter, time, severity: m.severity, text: m.text, source: m.source }
    setMessages(prev => {
      const next = [...prev, entry]
      return next.length > 500 ? next.slice(-500) : next
    })
    // Auto-switch to console on warnings/errors
    if (m.severity <= 4) setActiveTab('console')
  }, [])

  useEffect(() => {
    const offTel = window.gcs.onTelemetry(handleTelemetry)
    const offMsg = window.gcs.onMessage(handleMessage)
    return () => { offTel(); offMsg() }
  }, [handleTelemetry, handleMessage])

  const handleConnect = async (cfg: ConnectionConfig) => {
    await window.gcs.connect(cfg)
  }

  const handleDisconnect = async () => {
    await window.gcs.disconnect()
  }

  const handleMapClick = (lat: number, lng: number) => {
    setWaypoints(prev => {
      const seq = prev.length
      const wp: WaypointItem = {
        seq, lat, lng, alt: 50,
        command: 16, frame: 3,
        current: seq === 0 ? 1 : 0,
        autocontinue: 1,
        param1: 0, param2: 0, param3: 0, param4: 0,
      }
      return [...prev, wp]
    })
    setActiveTab('mission')
  }

  const handleRemoveWp = (seq: number) => {
    setWaypoints(prev => {
      const filtered = prev.filter(w => w.seq !== seq)
      return filtered.map((w, i) => ({ ...w, seq: i, current: i === 0 ? 1 : 0 }))
    })
  }

  const handleAltChange = (seq: number, alt: number) => {
    setWaypoints(prev => prev.map(w => w.seq === seq ? { ...w, alt } : w))
  }

  const handleUpload = async () => {
    await window.gcs.uploadMission(waypoints.map(w => ({ lat: w.lat, lng: w.lng, alt: w.alt })))
  }

  const SIDEBAR_W = 230
  const HUD_W = 290

  const tabBtn = (t: Tab, label: string) => (
    <button
      key={t}
      onClick={() => setActiveTab(t)}
      style={{
        flex: 1, fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold',
        padding: '7px 0', background: 'none', border: 'none',
        borderBottom: activeTab === t ? '2px solid #00d4ff' : '2px solid #1a2030',
        color: activeTab === t ? '#00d4ff' : '#6b7280',
        cursor: 'pointer', letterSpacing: '0.1em',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#050508', color: '#e8e8e8', overflow: 'hidden' }}>

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div style={{
        width: SIDEBAR_W, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #1a2030', background: '#080c14',
      }}>
        {/* Logo */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #1a2030',
          fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: '#00d4ff',
          letterSpacing: '0.2em',
        }}>
          X-IHA <span style={{ fontSize: 9, color: '#6b7280', letterSpacing: '0.3em' }}>GCS v1.0</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1a2030', flexWrap: 'wrap' }}>
          {tabBtn('connection', 'BAĞL')}
          {tabBtn('mission', 'GÖREV')}
          {tabBtn('console', 'KONSOL')}
          {tabBtn('camera', 'KAMERA')}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'connection' && (
            <ConnectionPanel
              connected={tel.connected}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          )}
          {activeTab === 'mission' && (
            <MissionPanel
              waypoints={waypoints}
              onRemove={handleRemoveWp}
              onClear={() => setWaypoints([])}
              onUpload={handleUpload}
              onAltChange={handleAltChange}
              connected={tel.connected}
            />
          )}
          {activeTab === 'console' && (
            <Console
              messages={messages}
              onClear={() => setMessages([])}
            />
          )}
          {activeTab === 'camera' && (
            <CameraFeed />
          )}
        </div>
      </div>

      {/* ── Map (center) ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MapView
          lat={tel.lat}
          lng={tel.lng}
          heading={tel.heading}
          waypoints={waypoints}
          onMapClick={handleMapClick}
        />

        {/* Map overlay — top status bar */}
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(5,5,8,0.85)', border: '1px solid #1a2030',
          padding: '5px 16px', display: 'flex', gap: 24,
          fontFamily: 'monospace', fontSize: 11, backdropFilter: 'blur(6px)',
        }}>
          <span style={{ color: '#00d4ff' }}>HDG <b>{Math.round(tel.heading)}°</b></span>
          <span style={{ color: '#00ff88' }}>ALT <b>{tel.relAltitude.toFixed(0)}m</b></span>
          <span style={{ color: '#e8e8e8' }}>GS <b>{tel.groundspeed.toFixed(1)}m/s</b></span>
          <span style={{ color: tel.armed ? '#ff4d00' : '#6b7280' }}>{tel.armed ? '● ARMED' : '○ DISARMED'}</span>
          <span style={{ color: tel.connected ? '#00ff88' : '#ff4d00' }}>{tel.connected ? '● LINK' : '○ NO LINK'}</span>
        </div>
      </div>

      {/* ── Right HUD panel ──────────────────────────────────────────────── */}
      <div style={{
        width: HUD_W, flexShrink: 0,
        borderLeft: '1px solid #1a2030', background: '#080c14',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '10px 12px 4px', borderBottom: '1px solid #1a2030', fontFamily: 'monospace', fontSize: 9, color: '#6b7280', letterSpacing: '0.25em' }}>
          // TELEMETRI HUD
        </div>
        <HUD tel={tel} />
      </div>
    </div>
  )
}

export default App

