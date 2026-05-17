import { useRef, useEffect } from 'react'
import type { MessageLog } from '../types'
import { SEV_COLORS } from '../types'

const SEV_LABELS: Record<number, string> = {
  0: 'EMRG', 1: 'ALRT', 2: 'CRIT', 3: 'ERR ',
  4: 'WARN', 5: 'NOTE', 6: 'INFO', 7: 'DBG ',
}

interface ConsoleProps {
  messages: MessageLog[]
  onClear: () => void
}

export default function Console({ messages, onClear }: ConsoleProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)

  const checkScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 20
  }

  useEffect(() => {
    if (isAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '8px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#6b7280', letterSpacing: '0.25em' }}>
          // KONSOL — {messages.length} MESAJ
        </span>
        <button
          onClick={onClear}
          style={{
            fontFamily: 'monospace', fontSize: 9, background: 'none', border: '1px solid #1a2030',
            color: '#6b7280', cursor: 'pointer', padding: '2px 8px', borderRadius: 2,
          }}
        >
          TEMİZLE
        </button>
      </div>

      <div
        ref={containerRef}
        onScroll={checkScroll}
        style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: 10, lineHeight: 1.5 }}
      >
        {messages.length === 0 ? (
          <div style={{ color: '#6b7280', padding: '20px 0', textAlign: 'center' }}>
            Henüz mesaj yok
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              style={{
                display: 'flex', gap: 8, padding: '2px 0',
                borderBottom: '1px solid #0e1520',
                color: SEV_COLORS[msg.severity] ?? '#e8e8e8',
              }}
            >
              <span style={{ color: '#6b7280', flexShrink: 0 }}>{msg.time}</span>
              <span style={{ flexShrink: 0, color: SEV_COLORS[msg.severity] ?? '#6b7280' }}>
                [{SEV_LABELS[msg.severity] ?? '????'}]
              </span>
              <span style={{ color: msg.source === 'mavlink' ? '#00d4ff' : '#6b7280', flexShrink: 0, fontSize: 8 }}>
                {msg.source === 'mavlink' ? 'FC' : 'SYS'}
              </span>
              <span style={{ wordBreak: 'break-word' }}>{msg.text}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
