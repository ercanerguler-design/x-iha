import type { Telemetry } from '../types'
import { GPS_FIX_LABELS } from '../types'

interface HUDProps {
  tel: Telemetry
}

function Row({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '3px 0', borderBottom: '1px solid #0e1520' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#6b7280', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: color ?? '#e8e8e8' }}>
        {value}{unit && <span style={{ fontSize: 9, color: '#6b7280', marginLeft: 2 }}>{unit}</span>}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#6b7280', letterSpacing: '0.25em', padding: '5px 0 3px', borderBottom: '1px solid #1a2030' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// Simple SVG attitude indicator
function AttitudeIndicator({ roll, pitch }: { roll: number; pitch: number }) {
  const size = 90
  const cx = size / 2
  const cy = size / 2
  const r = 40
  const pitchPx = Math.max(-r, Math.min(r, pitch * 0.8)) // scale pitch
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
      <svg width={size} height={size} style={{ borderRadius: '50%', border: '1px solid #1a2030' }}>
        <defs>
          <clipPath id="adi-clip"><circle cx={cx} cy={cy} r={r} /></clipPath>
        </defs>
        <g clipPath="url(#adi-clip)" transform={`rotate(${-roll}, ${cx}, ${cy})`}>
          {/* Sky */}
          <rect x={0} y={0} width={size} height={cy + pitchPx} fill="#0a1a2e" />
          {/* Ground */}
          <rect x={0} y={cy + pitchPx} width={size} height={size} fill="#1a0e05" />
          {/* Horizon line */}
          <line x1={0} y1={cy + pitchPx} x2={size} y2={cy + pitchPx} stroke="#00d4ff" strokeWidth={1} opacity={0.8} />
          {/* Pitch lines */}
          {[-20, -10, 10, 20].map(deg => {
            const y = cy + pitchPx + deg * 0.8
            return <line key={deg} x1={cx - 12} y1={y} x2={cx + 12} y2={y} stroke="#ffffff" strokeWidth={0.5} opacity={0.4} />
          })}
        </g>
        {/* Fixed aircraft symbol */}
        <line x1={cx - 18} y1={cy} x2={cx - 6} y2={cy} stroke="#ffaa00" strokeWidth={2} />
        <line x1={cx + 6} y1={cy} x2={cx + 18} y2={cy} stroke="#ffaa00" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={2} fill="#ffaa00" />
        {/* Roll arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a2030" strokeWidth={1} />
      </svg>
    </div>
  )
}

// Battery bar
function BattBar({ pct, voltage }: { pct: number; voltage: number }) {
  const color = pct > 50 ? '#00ff88' : pct > 20 ? '#ffaa00' : '#ff4d00'
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#6b7280' }}>BATTERY</span>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color }}>
          {pct < 0 ? '—' : `${pct}%`}
          <span style={{ fontSize: 9, color: '#6b7280', marginLeft: 4 }}>{voltage.toFixed(2)}V</span>
        </span>
      </div>
      <div style={{ height: 4, background: '#1a2030', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.max(0, pct)}%`, background: color, transition: 'all 0.3s', borderRadius: 2 }} />
      </div>
    </div>
  )
}

export default function HUD({ tel }: HUDProps) {
  const gpsLabel = GPS_FIX_LABELS[tel.gpsFixType] ?? 'UNKNOWN'
  const gpsColor = tel.gpsFixType >= 3 ? '#00ff88' : tel.gpsFixType >= 2 ? '#ffaa00' : '#ff4d00'
  const armedColor = tel.armed ? '#ff4d00' : '#6b7280'

  return (
    <div style={{ padding: '10px 12px', overflowY: 'auto', height: '100%' }}>

      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, padding: '5px 8px', background: '#0a0f1a', border: '1px solid #1a2030' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold', color: armedColor }}>
          {tel.armed ? '◉ ARMED' : '○ DISARMED'}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#00d4ff' }}>{tel.flightMode}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: tel.connected ? '#00ff88' : '#ff4d00' }}>
          {tel.connected ? '● LINK' : '○ NO LINK'}
        </span>
      </div>

      {/* Attitude indicator */}
      <AttitudeIndicator roll={tel.roll} pitch={tel.pitch} />

      {/* Battery */}
      <div style={{ marginBottom: 8 }}>
        <BattBar pct={tel.battRemaining} voltage={tel.battVoltage} />
      </div>

      {/* GPS */}
      <Section title="// GPS">
        <Row label="FIX" value={gpsLabel} color={gpsColor} />
        <Row label="SATS" value={tel.gpsSats} color={gpsColor} />
        <Row label="LAT" value={tel.lat.toFixed(6)} unit="°N" color="#e8e8e8" />
        <Row label="LNG" value={tel.lng.toFixed(6)} unit="°E" color="#e8e8e8" />
      </Section>

      {/* Navigation */}
      <Section title="// NAVIGATION">
        <Row label="ALT MSL" value={tel.altitude.toFixed(1)} unit="m" color="#00d4ff" />
        <Row label="ALT AGL" value={tel.relAltitude.toFixed(1)} unit="m" color="#00d4ff" />
        <Row label="AIRSPEED" value={tel.airspeed.toFixed(1)} unit="m/s" />
        <Row label="GNDSPEED" value={tel.groundspeed.toFixed(1)} unit="m/s" />
        <Row label="HEADING" value={Math.round(tel.heading)} unit="°" color="#00d4ff" />
        <Row label="CLIMB" value={tel.climb.toFixed(1)} unit="m/s" color={tel.climb > 0 ? '#00ff88' : tel.climb < -0.5 ? '#ff4d00' : '#e8e8e8'} />
      </Section>

      {/* Attitude */}
      <Section title="// ATTITUDE">
        <Row label="ROLL" value={tel.roll.toFixed(1)} unit="°" color={Math.abs(tel.roll) > 30 ? '#ff4d00' : '#e8e8e8'} />
        <Row label="PITCH" value={tel.pitch.toFixed(1)} unit="°" color={Math.abs(tel.pitch) > 20 ? '#ff4d00' : '#e8e8e8'} />
        <Row label="YAW" value={((tel.yaw + 360) % 360).toFixed(1)} unit="°" />
        <Row label="THROTTLE" value={tel.throttle} unit="%" color={tel.throttle > 80 ? '#ffaa00' : '#e8e8e8'} />
      </Section>

      {/* System */}
      <Section title="// SYSTEM">
        <Row label="BATT CURR" value={tel.battCurrent.toFixed(1)} unit="A" />
      </Section>
    </div>
  )
}
