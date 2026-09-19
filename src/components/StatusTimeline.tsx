'use client'

import React from 'react'
import { BusTransitIcon, DepotIcon } from '@/components/BusIcons'

export const ALL_STATUSES = [
  { key: 'BOOKED', label: 'Booked', code: '01' },
  { key: 'LOADED', label: 'Loaded', code: '02' },
  { key: 'IN_TRANSIT', label: 'In Transit', code: '03' },
  { key: 'UNLOADED', label: 'Unloaded', code: '04' },
  { key: 'CLAIMED', label: 'Claimed', code: '05' },
]

interface StatusLog {
  status: string
  timestamp: string
  note: string | null
}

interface StatusTimelineProps {
  statusLogs: StatusLog[]
  currentStatus: string
  departureDepot?: string
  arrivalDepot?: string
  busNumber?: string
}

export default function StatusTimeline({
  statusLogs,
  currentStatus,
  departureDepot = 'Origin Depot',
  arrivalDepot = 'Destination Depot',
  busNumber,
}: StatusTimelineProps) {
  const logMap = new Map(statusLogs.map((l) => [l.status, l]))
  const currentIdx = ALL_STATUSES.findIndex((s) => s.key === currentStatus)

  // Calculate bus position along the route (0% to 100%)
  // BOOKED/LOADED: 10% (at origin)
  // IN_TRANSIT: 50% (midway with subtle drift)
  // UNLOADED/CLAIMED: 90% (at destination)
  let busPercent = 10
  let isDrifting = false

  if (currentStatus === 'LOADED') {
    busPercent = 18
  } else if (currentStatus === 'IN_TRANSIT') {
    busPercent = 50
    isDrifting = true
  } else if (currentStatus === 'UNLOADED') {
    busPercent = 85
  } else if (currentStatus === 'CLAIMED') {
    busPercent = 90
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. HORIZONTAL ROUTE TRACK WITH FUNCTIONAL BUS */}
      <div
        style={{
          backgroundColor: '#141414',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '24px 20px 20px',
          position: 'relative',
        }}
      >
        {/* Origin & Destination Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DepotIcon size={20} color={currentIdx >= 0 ? '#3ECF8E' : '#A0A0A0'} />
            <div>
              <div style={{ fontSize: '10px', color: '#A0A0A0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                ORIGIN DEPOT
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#EDEDED' }}>{departureDepot}</div>
            </div>
          </div>

          {busNumber && (
            <div
              className="font-mono"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(232, 130, 12, 0.12)',
                color: '#E8820C',
                border: '1px solid rgba(232, 130, 12, 0.3)',
              }}
            >
              BUS: {busNumber}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'right' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#A0A0A0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                DESTINATION DEPOT
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#EDEDED' }}>{arrivalDepot}</div>
            </div>
            <DepotIcon size={20} color={currentIdx >= 3 ? '#3ECF8E' : '#A0A0A0'} />
          </div>
        </div>

        {/* The Track Line with Moving Bus */}
        <div style={{ position: 'relative', height: '48px', display: 'flex', alignItems: 'center', margin: '4px 8px' }}>
          {/* Base Track */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '2px',
            }}
          />

          {/* Active Completed Track (in Supabase Green) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: `${busPercent}%`,
              height: '3px',
              backgroundColor: '#3ECF8E',
              borderRadius: '2px',
              transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* Moving Bus Container */}
          <div
            style={{
              position: 'absolute',
              left: `${busPercent}%`,
              transform: 'translateX(-50%)',
              transition: 'left 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 2,
            }}
          >
            <div className={isDrifting ? 'animate-bus-drift' : ''}>
              <BusTransitIcon size={44} color="#3ECF8E" />
            </div>
            <span
              className="font-mono"
              style={{
                fontSize: '9px',
                fontWeight: 600,
                color: currentStatus === 'IN_TRANSIT' ? '#E8820C' : '#3ECF8E',
                letterSpacing: '0.05em',
                marginTop: '3px',
                whiteSpace: 'nowrap',
              }}
            >
              {currentStatus === 'IN_TRANSIT' ? 'EN ROUTE' : currentStatus}
            </span>
          </div>
        </div>
      </div>

      {/* 2. STAGES AUDIT TIMELINE (5 strict state machine stages) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
          gap: '12px',
        }}
      >
        {ALL_STATUSES.map((stage, idx) => {
          const log = logMap.get(stage.key)
          const isPassed = idx <= currentIdx
          const isCurrent = idx === currentIdx

          return (
            <div
              key={stage.key}
              style={{
                backgroundColor: isCurrent ? '#1F2421' : '#141414',
                border: `1px solid ${
                  isCurrent
                    ? '#3ECF8E'
                    : isPassed
                    ? 'rgba(62, 207, 142, 0.3)'
                    : 'rgba(255, 255, 255, 0.06)'
                }`,
                borderRadius: '6px',
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-mono" style={{ fontSize: '10px', color: isPassed ? '#3ECF8E' : '#A0A0A0' }}>
                  {stage.code}
                </span>
                {isCurrent && (
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '9px',
                      backgroundColor: '#E8820C',
                      color: '#0A0A0A',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '3px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    NOW
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: '12px',
                  fontWeight: isCurrent ? 700 : isPassed ? 600 : 400,
                  color: isCurrent ? '#EDEDED' : isPassed ? '#EDEDED' : '#A0A0A0',
                }}
              >
                {stage.label}
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                {log ? (
                  <div className="font-mono" style={{ fontSize: '10px', color: '#A0A0A0', lineHeight: 1.3 }}>
                    {new Date(log.timestamp).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                    <div style={{ fontSize: '9px', opacity: 0.8 }}>
                      {new Date(log.timestamp).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="font-mono" style={{ fontSize: '10px', color: '#444444' }}>
                    Pending
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
