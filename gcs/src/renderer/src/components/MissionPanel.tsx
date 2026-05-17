import type { WaypointItem } from '../types'

interface MissionPanelProps {
  waypoints: WaypointItem[]
  onRemove: (seq: number) => void
  onClear: () => void
  onUpload: () => void
  onAltChange: (seq: number, alt: number) => void
  connected: boolean
}

export default function MissionPanel({ waypoints, onRemove, onClear, onUpload, onAltChange, connected }: MissionPanelProps) {
  const inputStyle: React.CSSProperties = {
    background: '#0a0f1a',
    border: '1px solid #1a2030',
    color: '#00d4ff',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '2px 6px',
    width: 60,
    outline: 'none',
    borderRadius: 2,
  }

  return (
    <div style={{ padding: '10px 12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#6b7280', letterSpacing: '0.25em', marginBottom: 10 }}>
        // GÖREV — {waypoints.length} WP
      </div>

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 10 }}>
        {waypoints.length === 0 ? (
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6b7280', padding: '20px 0', textAlign: 'center', lineHeight: 1.8 }}>
            Haritaya tıklayarak<br/>waypoint ekle
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'LAT', 'LNG', 'ALT', ''].map(h => (
                  <th key={h} style={{ fontFamily: 'monospace', fontSize: 8, color: '#6b7280', padding: '3px 3px', textAlign: 'left', borderBottom: '1px solid #1a2030' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {waypoints.map(wp => (
                <tr key={wp.seq} style={{ borderBottom: '1px solid #0e1520' }}>
                  <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#ff4d00', fontWeight: 'bold', padding: '4px 3px' }}>
                    {wp.seq + 1}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 9, color: '#e8e8e8', padding: '4px 3px' }}>
                    {wp.lat.toFixed(5)}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 9, color: '#e8e8e8', padding: '4px 3px' }}>
                    {wp.lng.toFixed(5)}
                  </td>
                  <td style={{ padding: '4px 3px' }}>
                    <input
                      type="number"
                      value={wp.alt}
                      onChange={e => onAltChange(wp.seq, Number(e.target.value))}
                      style={inputStyle}
                    />
                  </td>
                  <td style={{ padding: '4px 3px' }}>
                    <button
                      onClick={() => onRemove(wp.seq)}
                      style={{
                        background: 'none', border: 'none', color: '#ff4d00',
                        cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, padding: 0,
                      }}
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
        <button
          onClick={onUpload}
          disabled={waypoints.length === 0 || !connected}
          style={{
            fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', padding: '7px 0',
            background: waypoints.length > 0 && connected ? '#00d4ff' : '#1a2030',
            color: waypoints.length > 0 && connected ? '#050508' : '#6b7280',
            border: 'none', cursor: waypoints.length > 0 && connected ? 'pointer' : 'default',
            borderRadius: 2, letterSpacing: '0.1em',
          }}
        >
          ↑ GÖREVI YÜKLE
        </button>
        <button
          onClick={onClear}
          disabled={waypoints.length === 0}
          style={{
            fontFamily: 'monospace', fontSize: 11, padding: '5px 0',
            background: 'none',
            color: waypoints.length > 0 ? '#ff4d00' : '#6b7280',
            border: `1px solid ${waypoints.length > 0 ? '#ff4d00' : '#1a2030'}`,
            cursor: waypoints.length > 0 ? 'pointer' : 'default',
            borderRadius: 2,
          }}
        >
          ✕ TEMİZLE
        </button>
      </div>

      <div style={{ marginTop: 10, padding: '6px 8px', background: '#0a0f1a', border: '1px solid #1a2030', fontFamily: 'monospace', fontSize: 9, color: '#6b7280', lineHeight: 1.6 }}>
        Varsayılan irtifa: 50 m<br/>
        İrtifayı tablodan düzenle
      </div>
    </div>
  )
}
