'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { enqueue, flush, getQueueCount, QueueItem } from '@/lib/offlineQueue'

const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false })

type ScanState =
  | { type: 'idle' }
  | { type: 'loading'; waybillId: string }
  | { type: 'ready'; waybillId: string; currentStatus: string; nextStatus: string; actionLabel: string; busNumber: string; routeName: string }
  | { type: 'already_at_status'; waybillId: string; status: string; updatedAt: string }
  | { type: 'invalid_transition'; waybillId: string; status: string; message: string }
  | { type: 'not_found'; waybillId: string }
  | { type: 'network_error'; waybillId: string; nextStatus: string }
  | { type: 'success'; waybillId: string; newStatus: string }

const STATUS_LABELS: Record<string, string> = {
  BOOKED: 'Booked',
  LOADED: 'Loaded onto Bus',
  IN_TRANSIT: 'In Transit',
  UNLOADED: 'Unloaded at Destination',
  CLAIMED: 'Claimed',
}

const ACTION_LABELS: Record<string, string> = {
  BOOKED: 'Confirm Loaded',
  LOADED: 'Confirm In Transit',
  IN_TRANSIT: 'Confirm Unloaded',
  UNLOADED: 'Confirm Claimed',
}

const NEXT_STATUS: Record<string, string> = {
  BOOKED: 'LOADED',
  LOADED: 'IN_TRANSIT',
  IN_TRANSIT: 'UNLOADED',
  UNLOADED: 'CLAIMED',
}

export default function ConductorPage() {
  const [scanState, setScanState] = useState<ScanState>({ type: 'idle' })
  const [scanning, setScanning] = useState(true)
  const [queueCount, setQueueCount] = useState(0)
  const [syncResults, setSyncResults] = useState<string[]>([])
  const [transitioning, setTransitioning] = useState(false)

  const refreshQueueCount = useCallback(() => {
    setQueueCount(getQueueCount())
  }, [])

  // Sync executor — called by flush()
  const syncItem = useCallback(async (item: QueueItem): Promise<boolean> => {
    try {
      const res = await fetch(`/api/parcels/${item.waybillId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus: item.newStatus }),
      })
      if (res.ok) return true
      const data = await res.json()
      // If already at status, treat as success (idempotent)
      if (data.code === 'ALREADY_AT_STATUS') return true
      return false
    } catch {
      return false
    }
  }, [])

  const handleSync = useCallback(async () => {
    const results = await flush(syncItem)
    refreshQueueCount()
    const messages = results.map((r) =>
      r.success ? `✓ ${r.waybillId} synced` :
      r.permanent ? `✗ ${r.waybillId} failed permanently` :
      `~ ${r.waybillId} retry later`
    )
    setSyncResults(messages)
    setTimeout(() => setSyncResults([]), 4000)
  }, [syncItem, refreshQueueCount])

  // Auto-sync on mount and visibility change
  useEffect(() => {
    refreshQueueCount()
    handleSync()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleSync()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [handleSync, refreshQueueCount])

  const handleScan = useCallback(async (waybillId: string) => {
    if (scanState.type === 'loading') return // debounce
    setScanning(false)
    setScanState({ type: 'loading', waybillId })

    try {
      const res = await fetch(`/api/parcels/${waybillId}`)
      if (res.status === 404) {
        setScanState({ type: 'not_found', waybillId })
        return
      }
      if (!res.ok) throw new Error('Network error')

      const parcel = await res.json()
      const nextStatus = NEXT_STATUS[parcel.status]

      if (!nextStatus) {
        setScanState({ type: 'invalid_transition', waybillId, status: parcel.status, message: `This parcel is already ${STATUS_LABELS[parcel.status] ?? parcel.status} — nothing left to do.` })
        return
      }

      setScanState({
        type: 'ready',
        waybillId,
        currentStatus: parcel.status,
        nextStatus,
        actionLabel: ACTION_LABELS[parcel.status] ?? `Move to ${nextStatus}`,
        busNumber: parcel.trip?.busNumber ?? '',
        routeName: parcel.trip?.routeName ?? '',
      })
    } catch {
      const nextStatus = 'LOADED' // fallback for offline queue
      setScanState({ type: 'network_error', waybillId, nextStatus })
    }
  }, [scanState.type])

  const handleTransition = useCallback(async () => {
    if (scanState.type !== 'ready') return
    setTransitioning(true)

    const { waybillId, nextStatus } = scanState

    try {
      const res = await fetch(`/api/parcels/${waybillId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus: nextStatus }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'ALREADY_AT_STATUS') {
          setScanState({ type: 'already_at_status', waybillId, status: nextStatus, updatedAt: new Date().toISOString() })
        } else {
          setScanState({ type: 'invalid_transition', waybillId, status: scanState.currentStatus, message: data.error ?? 'Transition failed' })
        }
      } else {
        setScanState({ type: 'success', waybillId, newStatus: nextStatus })
      }
    } catch {
      // Queue offline
      enqueue({ waybillId, newStatus: nextStatus, timestamp: new Date().toISOString() })
      refreshQueueCount()
      setScanState({ type: 'network_error', waybillId, nextStatus })
    } finally {
      setTransitioning(false)
    }
  }, [scanState, refreshQueueCount])

  const handleQueueOffline = useCallback(() => {
    if (scanState.type !== 'network_error') return
    enqueue({ waybillId: scanState.waybillId, newStatus: scanState.nextStatus, timestamp: new Date().toISOString() })
    refreshQueueCount()
    setScanState({ type: 'idle' })
    setScanning(true)
  }, [scanState, refreshQueueCount])

  const resetScan = useCallback(() => {
    setScanState({ type: 'idle' })
    setScanning(true)
  }, [])

  const bg = '#111111'
  const textColor = '#F5F2EE'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bg, color: textColor, display: 'flex', flexDirection: 'column', fontFamily: 'IBM Plex Sans, sans-serif', maxWidth: '480px', margin: '0 auto' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #222' }}>
        <a href="/" style={{ color: '#7A8694', fontSize: '13px', textDecoration: 'none' }}>← Home</a>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#F5F2EE' }}>Conductor</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {queueCount > 0 && (
            <button
              onClick={handleSync}
              style={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#E8820C', color: 'white', border: 'none', padding: '4px 10px', cursor: 'pointer', borderRadius: '2px' }}
            >
              Sync {queueCount}
            </button>
          )}
        </div>
      </div>

      {/* Sync results toast */}
      {syncResults.length > 0 && (
        <div style={{ padding: '8px 16px', backgroundColor: '#1a2a1a', fontSize: '11px', color: '#6edb71', borderBottom: '1px solid #222' }}>
          {syncResults.map((r, i) => <div key={i}>{r}</div>)}
        </div>
      )}

      {/* Camera area */}
      <div style={{ flex: '0 0 60vh', position: 'relative', backgroundColor: '#000', overflow: 'hidden' }}>
        {scanning ? (
          <QRScanner onScan={handleScan} active={scanning} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
            <div style={{ textAlign: 'center', color: '#7A8694' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📦</div>
              <div style={{ fontSize: '13px' }}>Camera paused</div>
            </div>
          </div>
        )}

        {/* Scanning overlay — crosshair */}
        {scanning && scanState.type === 'idle' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: '200px', height: '200px', border: '2px solid #E8820C', opacity: 0.8 }} />
          </div>
        )}
      </div>

      {/* Action panel — bottom */}
      <div style={{ flex: 1, padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '200px' }}>

        {scanState.type === 'idle' && (
          <div style={{ textAlign: 'center', paddingTop: '16px' }}>
            <div style={{ fontSize: '15px', color: '#7A8694' }}>Point camera at a waybill QR code</div>
          </div>
        )}

        {scanState.type === 'loading' && (
          <div style={{ textAlign: 'center', paddingTop: '16px' }}>
            <div style={{ fontSize: '14px', color: '#7A8694' }}>Looking up <span style={{ color: '#F5F2EE', fontVariantNumeric: 'tabular-nums' }}>{scanState.waybillId}</span>…</div>
          </div>
        )}

        {scanState.type === 'ready' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div>
              <div style={{ fontSize: '11px', color: '#7A8694', letterSpacing: '0.1em', marginBottom: '2px' }}>SCANNED</div>
              <div style={{ fontSize: '20px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#F5F2EE' }}>{scanState.waybillId}</div>
              <div style={{ fontSize: '13px', color: '#7A8694', marginTop: '4px' }}>{scanState.routeName} · Bus {scanState.busNumber}</div>
            </div>
            <div style={{ fontSize: '12px', color: '#7A8694' }}>Current: <span style={{ color: '#F5F2EE' }}>{STATUS_LABELS[scanState.currentStatus]}</span></div>

            <div style={{ flex: 1 }} />

            <button
              onClick={handleTransition}
              disabled={transitioning}
              style={{
                padding: '18px', backgroundColor: transitioning ? '#7A8694' : '#E8820C',
                color: 'white', border: 'none', fontFamily: 'IBM Plex Sans, sans-serif',
                fontWeight: 700, fontSize: '17px', cursor: transitioning ? 'not-allowed' : 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              {transitioning ? 'Updating…' : scanState.actionLabel}
            </button>
            <button onClick={resetScan} style={{ padding: '12px', backgroundColor: 'transparent', color: '#7A8694', border: '1px solid #333', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '13px', cursor: 'pointer' }}>Scan Another</button>
          </div>
        )}

        {scanState.type === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div style={{ padding: '16px', backgroundColor: 'rgba(11,97,87,0.3)', border: '1px solid #0B6157' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#6edb71', marginBottom: '4px' }}>✓ Updated</div>
              <div style={{ fontSize: '14px', color: '#F5F2EE', fontVariantNumeric: 'tabular-nums' }}>{scanState.waybillId}</div>
              <div style={{ fontSize: '13px', color: '#7A8694', marginTop: '4px' }}>→ {STATUS_LABELS[scanState.newStatus]}</div>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={resetScan} style={{ padding: '18px', backgroundColor: '#0B6157', color: 'white', border: 'none', fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 700, fontSize: '17px', cursor: 'pointer' }}>Scan Next Parcel</button>
          </div>
        )}

        {/* Error: Not found */}
        {scanState.type === 'not_found' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div style={{ padding: '16px', backgroundColor: 'rgba(180,0,0,0.2)', border: '1px solid #aa2222' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#ff6b6b', marginBottom: '4px' }}>Not Found</div>
              <div style={{ fontSize: '13px', color: '#F5F2EE', fontVariantNumeric: 'tabular-nums' }}>{scanState.waybillId}</div>
              <div style={{ fontSize: '12px', color: '#7A8694', marginTop: '4px' }}>No parcel found — check the ID and try again.</div>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={resetScan} style={{ padding: '18px', backgroundColor: '#333', color: '#F5F2EE', border: 'none', fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>Scan Again</button>
          </div>
        )}

        {/* Error: Already at status */}
        {scanState.type === 'already_at_status' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div style={{ padding: '16px', backgroundColor: 'rgba(232,130,12,0.15)', border: '1px solid #E8820C' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#E8820C', marginBottom: '4px' }}>Already Updated</div>
              <div style={{ fontSize: '13px', color: '#F5F2EE', fontVariantNumeric: 'tabular-nums' }}>{scanState.waybillId}</div>
              <div style={{ fontSize: '12px', color: '#7A8694', marginTop: '4px' }}>Already marked {STATUS_LABELS[scanState.status] ?? scanState.status} — no action needed.</div>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={resetScan} style={{ padding: '18px', backgroundColor: '#333', color: '#F5F2EE', border: 'none', fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>Scan Next</button>
          </div>
        )}

        {/* Error: Invalid / final transition */}
        {scanState.type === 'invalid_transition' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div style={{ padding: '16px', backgroundColor: 'rgba(232,130,12,0.15)', border: '1px solid #E8820C' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#E8820C', marginBottom: '4px' }}>No Action Available</div>
              <div style={{ fontSize: '13px', color: '#F5F2EE', fontVariantNumeric: 'tabular-nums' }}>{scanState.waybillId}</div>
              <div style={{ fontSize: '12px', color: '#7A8694', marginTop: '4px' }}>{scanState.message}</div>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={resetScan} style={{ padding: '18px', backgroundColor: '#333', color: '#F5F2EE', border: 'none', fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>Scan Next</button>
          </div>
        )}

        {/* Network error — offer offline queue */}
        {scanState.type === 'network_error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div style={{ padding: '16px', backgroundColor: '#1a1a1a', border: '1px solid #444' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#F5F2EE', marginBottom: '4px' }}>No Connection</div>
              <div style={{ fontSize: '13px', color: '#F5F2EE', fontVariantNumeric: 'tabular-nums' }}>{scanState.waybillId}</div>
              <div style={{ fontSize: '12px', color: '#7A8694', marginTop: '4px' }}>Save this scan to the offline queue and sync later when connected.</div>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={handleQueueOffline} style={{ padding: '18px', backgroundColor: '#E8820C', color: 'white', border: 'none', fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 700, fontSize: '17px', cursor: 'pointer' }}>Save to Queue ({queueCount + 1})</button>
            <button onClick={resetScan} style={{ padding: '12px', backgroundColor: 'transparent', color: '#7A8694', border: '1px solid #333', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '13px', cursor: 'pointer' }}>Discard & Scan Again</button>
          </div>
        )}
      </div>
    </div>
  )
}
