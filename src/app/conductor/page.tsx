'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { enqueue, flush, getQueueCount, QueueItem } from '@/lib/offlineQueue'
import { BusLogo, BusTransitIcon } from '@/components/BusIcons'

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
  BOOKED: 'Booked at Depot',
  LOADED: 'Loaded into Hold',
  IN_TRANSIT: 'In Transit on Route',
  UNLOADED: 'Unloaded at Destination',
  CLAIMED: 'Claimed by Receiver',
}

const ACTION_LABELS: Record<string, string> = {
  BOOKED: 'Confirm Loaded onto Bus',
  LOADED: 'Confirm Departure (In Transit)',
  IN_TRANSIT: 'Confirm Unloaded at Depot',
  UNLOADED: 'Confirm Receiver Claim',
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
  const [manualId, setManualId] = useState('')

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
        setScanState({
          type: 'invalid_transition',
          waybillId,
          status: parcel.status,
          message: `This parcel is already at terminal state (${STATUS_LABELS[parcel.status] ?? parcel.status}) — no further transitions possible.`,
        })
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
    setManualId('')
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0A0A0A',
        color: '#EDEDED',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans)',
        maxWidth: '520px',
        margin: '0 auto',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: '#0A0A0A',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BusLogo size={20} color="#3ECF8E" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#EDEDED' }}>Conductor Mobile Scanner</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {queueCount > 0 && (
            <button
              onClick={handleSync}
              className="font-mono"
              style={{
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: '#E8820C',
                color: '#0A0A0A',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Sync ({queueCount})
            </button>
          )}
          <a href="/" style={{ color: '#A0A0A0', fontSize: '12px', textDecoration: 'none' }}>
            Exit
          </a>
        </div>
      </div>

      {/* Sync Results Toast */}
      {syncResults.length > 0 && (
        <div
          className="font-mono"
          style={{
            padding: '8px 16px',
            backgroundColor: '#12241A',
            fontSize: '11px',
            color: '#3ECF8E',
            borderBottom: '1px solid rgba(62,207,142,0.2)',
          }}
        >
          {syncResults.map((r, i) => (
            <div key={i}>{r}</div>
          ))}
        </div>
      )}

      {/* Camera Viewfinder (60vh) */}
      <div style={{ flex: '0 0 52vh', position: 'relative', backgroundColor: '#000000', overflow: 'hidden' }}>
        {scanning ? (
          <QRScanner onScan={handleScan} active={scanning} />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#141414',
            }}
          >
            <div style={{ textAlign: 'center', color: '#A0A0A0' }}>
              <BusTransitIcon size={48} color="#3ECF8E" />
              <div className="font-mono" style={{ fontSize: '12px', marginTop: '8px' }}>
                Camera Paused
              </div>
            </div>
          </div>
        )}

        {/* Crosshair Overlay */}
        {scanning && scanState.type === 'idle' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: '210px',
                height: '210px',
                border: '2px solid #3ECF8E',
                borderRadius: '8px',
                opacity: 0.85,
              }}
            />
          </div>
        )}
      </div>

      {/* Action & Status Transition Panel */}
      <div
        style={{
          flex: 1,
          padding: '20px 18px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: '#141414',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* IDLE STATE */}
        {scanState.type === 'idle' && (
          <div style={{ textAlign: 'center', paddingTop: '8px' }}>
            <div style={{ fontSize: '13px', color: '#A0A0A0', marginBottom: '14px' }}>
              Align waybill QR code inside camera view
            </div>

            {/* Manual Entry Fallback for Desktop Demos */}
            <div style={{ display: 'flex', gap: '8px', maxWidth: '340px', margin: '0 auto' }}>
              <input
                className="pv-input font-mono"
                placeholder="Or enter Waybill ID manually"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualId.trim()) {
                    handleScan(manualId.trim())
                  }
                }}
                style={{ fontSize: '12px', padding: '9px 12px' }}
              />
              <button
                type="button"
                onClick={() => {
                  if (manualId.trim()) handleScan(manualId.trim())
                }}
                style={{
                  padding: '9px 14px',
                  backgroundColor: '#3ECF8E',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Inspect
              </button>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {scanState.type === 'loading' && (
          <div style={{ textAlign: 'center', paddingTop: '16px' }}>
            <div className="font-mono" style={{ fontSize: '13px', color: '#3ECF8E' }}>
              Validating custody state for {scanState.waybillId}…
            </div>
          </div>
        )}

        {/* READY STATE: Only Single Valid State Machine Action Button */}
        {scanState.type === 'ready' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div
              style={{
                backgroundColor: '#1C1C1C',
                padding: '14px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#A0A0A0', letterSpacing: '0.1em' }}>SCANNED WAYBILL</div>
              <div className="font-mono" style={{ fontSize: '20px', fontWeight: 700, color: '#3ECF8E', marginTop: '2px' }}>
                {scanState.waybillId}
              </div>
              <div style={{ fontSize: '12px', color: '#EDEDED', marginTop: '4px' }}>
                {scanState.routeName} · Bus {scanState.busNumber}
              </div>
              <div className="font-mono" style={{ fontSize: '11px', color: '#E8820C', marginTop: '4px' }}>
                CURRENT: {STATUS_LABELS[scanState.currentStatus] ?? scanState.currentStatus}
              </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* Single Action Button */}
            <button
              onClick={handleTransition}
              disabled={transitioning}
              style={{
                padding: '16px',
                backgroundColor: transitioning ? '#555555' : '#3ECF8E',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '15px',
                cursor: transitioning ? 'not-allowed' : 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              {transitioning ? 'Recording Custody…' : `${scanState.actionLabel} →`}
            </button>

            <button
              onClick={resetScan}
              style={{
                padding: '10px',
                backgroundColor: 'transparent',
                color: '#A0A0A0',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancel / Scan Another
            </button>
          </div>
        )}

        {/* SUCCESS STATE */}
        {scanState.type === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div
              style={{
                padding: '16px',
                backgroundColor: 'rgba(62, 207, 142, 0.1)',
                border: '1px solid #3ECF8E',
                borderRadius: '6px',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#3ECF8E', marginBottom: '4px' }}>
                ✓ Custody Transition Recorded
              </div>
              <div className="font-mono" style={{ fontSize: '14px', color: '#EDEDED' }}>
                {scanState.waybillId}
              </div>
              <div className="font-mono" style={{ fontSize: '12px', color: '#E8820C', marginTop: '4px' }}>
                Status is now: {STATUS_LABELS[scanState.newStatus] ?? scanState.newStatus}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={resetScan}
              style={{
                padding: '15px',
                backgroundColor: '#3ECF8E',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Scan Next Luggage QR →
            </button>
          </div>
        )}

        {/* ERROR STATE: NOT FOUND */}
        {scanState.type === 'not_found' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#261212',
                border: '1px solid #7F2222',
                borderRadius: '6px',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#ff6b6b', marginBottom: '4px' }}>
                Waybill Not Found
              </div>
              <div className="font-mono" style={{ fontSize: '13px', color: '#EDEDED' }}>
                {scanState.waybillId}
              </div>
              <div style={{ fontSize: '12px', color: '#A0A0A0', marginTop: '4px' }}>
                No consignment registered with this number. Verify the waybill slip and retry.
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={resetScan}
              style={{
                padding: '14px',
                backgroundColor: '#1C1C1C',
                color: '#EDEDED',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Scan Again
            </button>
          </div>
        )}

        {/* ERROR STATE: ALREADY AT STATUS */}
        {scanState.type === 'already_at_status' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div
              style={{
                padding: '16px',
                backgroundColor: 'rgba(232, 130, 12, 0.12)',
                border: '1px solid #E8820C',
                borderRadius: '6px',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#E8820C', marginBottom: '4px' }}>
                Already Updated
              </div>
              <div className="font-mono" style={{ fontSize: '13px', color: '#EDEDED' }}>
                {scanState.waybillId}
              </div>
              <div style={{ fontSize: '12px', color: '#A0A0A0', marginTop: '4px' }}>
                Already recorded at status: {STATUS_LABELS[scanState.status] ?? scanState.status}. No duplicate action permitted.
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={resetScan}
              style={{
                padding: '14px',
                backgroundColor: '#1C1C1C',
                color: '#EDEDED',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Scan Next
            </button>
          </div>
        )}

        {/* ERROR STATE: INVALID / TERMINAL TRANSITION */}
        {scanState.type === 'invalid_transition' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div
              style={{
                padding: '16px',
                backgroundColor: 'rgba(232, 130, 12, 0.12)',
                border: '1px solid #E8820C',
                borderRadius: '6px',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#E8820C', marginBottom: '4px' }}>
                Terminal Custody Reached
              </div>
              <div className="font-mono" style={{ fontSize: '13px', color: '#EDEDED' }}>
                {scanState.waybillId}
              </div>
              <div style={{ fontSize: '12px', color: '#A0A0A0', marginTop: '4px' }}>
                {scanState.message}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={resetScan}
              style={{
                padding: '14px',
                backgroundColor: '#1C1C1C',
                color: '#EDEDED',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Scan Next
            </button>
          </div>
        )}

        {/* ERROR STATE: NETWORK ERROR (OFFLINE QUEUE) */}
        {scanState.type === 'network_error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#1C1C1C',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#EDEDED', marginBottom: '4px' }}>
                Connection Unavailable
              </div>
              <div className="font-mono" style={{ fontSize: '13px', color: '#3ECF8E' }}>
                {scanState.waybillId}
              </div>
              <div style={{ fontSize: '12px', color: '#A0A0A0', marginTop: '4px' }}>
                Store this custody scan in local storage and sync when bus reaches cellular coverage.
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={handleQueueOffline}
              style={{
                padding: '15px',
                backgroundColor: '#E8820C',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Save to Offline Queue ({queueCount + 1}) →
            </button>
            <button
              onClick={resetScan}
              style={{
                padding: '10px',
                backgroundColor: 'transparent',
                color: '#A0A0A0',
                border: 'none',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Discard &amp; Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
