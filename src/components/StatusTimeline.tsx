const ALL_STATUSES = [
  { key: 'BOOKED', label: 'Booked', icon: '📦' },
  { key: 'LOADED', label: 'Loaded onto Bus', icon: '🚌' },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: '🛣️' },
  { key: 'UNLOADED', label: 'Unloaded at Destination', icon: '📍' },
  { key: 'CLAIMED', label: 'Claimed', icon: '✅' },
]

interface StatusLog {
  status: string
  timestamp: string
  note: string | null
}

interface StatusTimelineProps {
  statusLogs: StatusLog[]
  currentStatus: string
}

export default function StatusTimeline({ statusLogs, currentStatus }: StatusTimelineProps) {
  const logMap = new Map(statusLogs.map((l) => [l.status, l]))
  const currentIdx = ALL_STATUSES.findIndex((s) => s.key === currentStatus)

  return (
    <div style={{ position: 'relative' }}>
      {ALL_STATUSES.map((stage, idx) => {
        const log = logMap.get(stage.key)
        const isDone = idx <= currentIdx
        const isCurrent = idx === currentIdx

        return (
          <div
            key={stage.key}
            className="timeline-animate"
            style={{ display: 'flex', gap: '16px', position: 'relative', opacity: 0 }}
          >
            {/* Left: dot + line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: isDone ? '#E8820C' : 'transparent',
                border: `2px solid ${isDone ? '#E8820C' : '#7A8694'}`,
                flexShrink: 0,
                marginTop: '3px',
                boxShadow: isCurrent ? '0 0 0 3px rgba(232, 130, 12, 0.25)' : 'none',
              }} />
              {idx < ALL_STATUSES.length - 1 && (
                <div style={{
                  width: '2px',
                  flex: 1,
                  minHeight: '32px',
                  backgroundColor: isDone && idx < currentIdx ? '#E8820C' : 'transparent',
                  borderLeft: isDone && idx < currentIdx ? 'none' : '2px dashed #7A8694',
                  margin: '4px 0',
                }} />
              )}
            </div>

            {/* Right: content */}
            <div style={{ paddingBottom: '24px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{stage.icon}</span>
                <span style={{
                  fontWeight: isCurrent ? 700 : isDone ? 600 : 400,
                  color: isCurrent ? '#E8820C' : isDone ? '#1A1A1A' : '#7A8694',
                  fontSize: '15px',
                }}>
                  {stage.label}
                </span>
                {isCurrent && (
                  <span style={{
                    fontSize: '10px',
                    backgroundColor: '#E8820C',
                    color: 'white',
                    padding: '2px 8px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                  }}>NOW</span>
                )}
              </div>
              {log ? (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#7A8694' }}>
                  {new Date(log.timestamp).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                  {log.note && <span style={{ marginLeft: '8px' }}>· {log.note}</span>}
                </div>
              ) : (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#7A8694' }}>Pending</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
