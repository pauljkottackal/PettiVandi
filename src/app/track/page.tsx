'use client'

import { useState, useEffect } from 'react'
import StatusTimeline from '@/components/StatusTimeline'
import { BusLogo } from '@/components/BusIcons'

interface Trip {
  routeName: string
  busNumber: string
  departureDepot: string
  arrivalDepot: string
  scheduledDeparture: string
  distanceKm: number
}

interface StatusLog {
  id: string
  status: string
  timestamp: string
  note: string | null
}

interface Parcel {
  id: string
  waybillId: string
  senderName: string
  receiverName: string
  weightKg: number
  calculatedFare: number
  status: string
  whatsappOptedIn: boolean
  trip: Trip
  statusLogs: StatusLog[]
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  BOOKED: 'Booked at Depot Counter',
  LOADED: 'Loaded into Bus Luggage Hold',
  IN_TRANSIT: 'In Transit on Route',
  UNLOADED: 'Unloaded at Destination Depot',
  CLAIMED: 'Collected by Receiver',
}

export default function TrackPage() {
  const [query, setQuery] = useState('')
  const [parcel, setParcel] = useState<Parcel | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // WhatsApp opt-in state (Two-Step Confirmation)
  const [waStep, setWaStep] = useState<'idle' | 'step1_tapped' | 'confirmed' | 'error'>('idle')
  const [waError, setWaError] = useState('')
  const [optInLoading, setOptInLoading] = useState(false)

  const performSearch = async (waybillId: string) => {
    if (!waybillId.trim()) return
    setLoading(true)
    setNotFound(false)
    setError('')
    setParcel(null)
    setWaStep('idle')

    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(waybillId.trim())}`)
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      if (!res.ok) throw new Error('Server error')
      const data = await res.json()
      setParcel(data)
      if (data.whatsappOptedIn) setWaStep('confirmed')
    } catch {
      setError('Connection error. Please check your network and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Check URL query param on mount (e.g. /track?id=PV-2026-...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const id = params.get('id')
      if (id) {
        setQuery(id)
        performSearch(id)
      }
    }
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(query)
  }

  // Step 1: Opens WhatsApp with prefilled join code, changes button prompt
  const handleWhatsAppStep1 = () => {
    const number = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER ?? '+14155238886'
    const rawCode = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_JOIN_CODE ?? 'twilio-trial'
    const code = rawCode.replace(/^join\s+/i, '').trim()
    const url = `https://wa.me/${number.replace('+', '')}?text=join%20${encodeURIComponent(code)}`
    window.open(url, '_blank')
    setWaStep('step1_tapped')
  }

  // Step 2: Explicit Confirmation click triggers the DB update
  const handleWhatsAppConfirm = async () => {
    if (!parcel) return
    setOptInLoading(true)
    setWaError('')
    try {
      const res = await fetch(`/api/parcels/${parcel.waybillId}/whatsapp-optin`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to activate opt-in')
      }
      setWaStep('confirmed')
      setParcel({ ...parcel, whatsappOptedIn: true })
    } catch (err) {
      setWaError(err instanceof Error ? err.message : 'Something went wrong')
      setWaStep('error')
    } finally {
      setOptInLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#EDEDED', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#0A0A0A', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BusLogo size={22} color="#3ECF8E" />
            <div>
              <div style={{ fontSize: '11px', color: '#3ECF8E', fontWeight: 600, letterSpacing: '0.05em' }}>KSRTC PETTIVANDI</div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#EDEDED' }}>Citizen Consignment Tracker</h1>
            </div>
          </div>
          <a href="/" style={{ color: '#A0A0A0', fontSize: '13px', textDecoration: 'none', padding: '5px 10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
            ← Home
          </a>
        </div>
      </header>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Search Input Box */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '32px' }}>
          <input
            className="pv-input font-mono"
            style={{ fontSize: '15px', padding: '13px 16px' }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter Waybill / Consignment ID (e.g. PV-2026-5258WOG)"
            autoCorrect="off"
            autoCapitalize="characters"
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '13px 24px',
              backgroundColor: loading ? '#555555' : '#3ECF8E',
              color: '#0A0A0A',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.15s ease',
            }}
          >
            {loading ? 'Locating…' : 'Track Parcel →'}
          </button>
        </form>

        {/* Not Found Panel */}
        {notFound && (
          <div
            style={{
              padding: '24px',
              backgroundColor: '#1C1C1C',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              marginBottom: '32px',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#EDEDED' }}>
              No parcel found with that ID
            </div>
            <div style={{ fontSize: '13px', color: '#A0A0A0', marginTop: '6px', lineHeight: 1.4 }}>
              Check the consignment number printed on your booking slip (format: <span className="font-mono" style={{ color: '#3ECF8E' }}>PV-2026-XXXXXX</span>) and try again.
            </div>
          </div>
        )}

        {/* Network Error */}
        {error && (
          <div
            className="font-mono"
            style={{
              padding: '14px 18px',
              backgroundColor: '#241212',
              border: '1px solid #732222',
              borderRadius: '6px',
              color: '#ff6b6b',
              fontSize: '13px',
              marginBottom: '28px',
            }}
          >
            {error}
          </div>
        )}

        {/* Parcel Result View */}
        {parcel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Top Summary Card */}
            <div
              className="pv-card"
              style={{
                backgroundColor: '#1C1C1C',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#A0A0A0', letterSpacing: '0.1em' }}>CONSIGNMENT ID</div>
                  <div className="font-mono" style={{ fontSize: '24px', fontWeight: 700, color: '#3ECF8E', marginTop: '2px' }}>
                    {parcel.waybillId}
                  </div>
                </div>

                <div
                  className="font-mono"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    backgroundColor:
                      parcel.status === 'CLAIMED'
                        ? 'rgba(62, 207, 142, 0.15)'
                        : parcel.status === 'IN_TRANSIT'
                        ? 'rgba(232, 130, 12, 0.15)'
                        : 'rgba(255, 255, 255, 0.08)',
                    color:
                      parcel.status === 'CLAIMED'
                        ? '#3ECF8E'
                        : parcel.status === 'IN_TRANSIT'
                        ? '#E8820C'
                        : '#EDEDED',
                    fontWeight: 700,
                    fontSize: '11px',
                    border: `1px solid ${
                      parcel.status === 'CLAIMED'
                        ? 'rgba(62, 207, 142, 0.3)'
                        : parcel.status === 'IN_TRANSIT'
                        ? 'rgba(232, 130, 12, 0.3)'
                        : 'rgba(255, 255, 255, 0.1)'
                    }`,
                  }}
                >
                  {STATUS_LABELS[parcel.status] ?? parcel.status}
                </div>
              </div>

              {/* Grid Details */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {[
                  ['ROUTE', parcel.trip.routeName, false],
                  ['BUS NUMBER', parcel.trip.busNumber, true],
                  ['DEPARTURE', parcel.trip.departureDepot, false],
                  ['DESTINATION', parcel.trip.arrivalDepot, false],
                  ['PARCEL WEIGHT', `${parcel.weightKg} kg`, true],
                  ['PAID FARE', `₹${parcel.calculatedFare.toFixed(2)}`, true],
                ].map(([label, value, isMono]) => (
                  <div key={label as string}>
                    <div style={{ fontSize: '9px', color: '#A0A0A0', letterSpacing: '0.08em', marginBottom: '3px' }}>
                      {label}
                    </div>
                    <div
                      className={isMono ? 'font-mono' : ''}
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: label === 'PAID FARE' ? '#E8820C' : '#EDEDED',
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Route Track with Moving Bus Graphic */}
            <div>
              <div style={{ fontSize: '11px', color: '#A0A0A0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                LIVE ROUTE &amp; CUSTODY TIMELINE
              </div>
              <StatusTimeline
                statusLogs={parcel.statusLogs}
                currentStatus={parcel.status}
                departureDepot={parcel.trip.departureDepot}
                arrivalDepot={parcel.trip.arrivalDepot}
                busNumber={parcel.trip.busNumber}
              />
            </div>

            {/* WhatsApp Notifications (Two-Step Flow) */}
            <div
              className="pv-card"
              style={{
                backgroundColor: '#1C1C1C',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '22px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '18px' }}>💬</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#EDEDED' }}>
                  WhatsApp Courier Alerts
                </span>
              </div>

              {/* Step 1: Idle (Show Intent Button) */}
              {waStep === 'idle' && (
                <div>
                  <p style={{ fontSize: '12px', color: '#A0A0A0', marginBottom: '16px', lineHeight: 1.4 }}>
                    Receive real-time WhatsApp updates as this bus departs, arrives at intermediate hubs, and completes delivery.
                  </p>
                  <button
                    onClick={handleWhatsAppStep1}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '11px 18px',
                      backgroundColor: '#3ECF8E',
                      color: '#0A0A0A',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    <span>💬</span> Get updates on WhatsApp →
                  </button>
                </div>
              )}

              {/* Step 2: Confirmation Step (Requires Explicit User Click) */}
              {waStep === 'step1_tapped' && (
                <div
                  style={{
                    backgroundColor: '#141414',
                    border: '1px solid rgba(62, 207, 142, 0.2)',
                    borderRadius: '6px',
                    padding: '16px',
                  }}
                >
                  <p style={{ fontSize: '13px', color: '#EDEDED', margin: '0 0 14px', lineHeight: 1.5 }}>
                    Once you've sent the join message in WhatsApp, tap below to activate updates.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleWhatsAppConfirm}
                      disabled={optInLoading}
                      style={{
                        padding: '10px 18px',
                        backgroundColor: '#3ECF8E',
                        color: '#0A0A0A',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: optInLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {optInLoading ? 'Activating…' : 'Yes, activate updates →'}
                    </button>
                    <button
                      onClick={handleWhatsAppStep1}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'transparent',
                        color: '#A0A0A0',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Re-open WhatsApp
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirmed Active State */}
              {waStep === 'confirmed' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#3ECF8E',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: 'rgba(62, 207, 142, 0.08)',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid rgba(62, 207, 142, 0.2)',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>✓</span>
                  WhatsApp courier alerts active for this consignment.
                </div>
              )}

              {/* Error State */}
              {waStep === 'error' && (
                <div>
                  <div className="font-mono" style={{ color: '#ff6b6b', fontSize: '12px', marginBottom: '10px' }}>
                    {waError}
                  </div>
                  <button
                    onClick={handleWhatsAppConfirm}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#3ECF8E',
                      color: '#0A0A0A',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
