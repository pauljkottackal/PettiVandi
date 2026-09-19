'use client'

import { useState } from 'react'
import StatusTimeline from '@/components/StatusTimeline'

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
  BOOKED: 'Booked',
  LOADED: 'Loaded onto Bus',
  IN_TRANSIT: 'In Transit',
  UNLOADED: 'Unloaded at Destination',
  CLAIMED: 'Claimed',
}

export default function TrackPage() {
  const [query, setQuery] = useState('')
  const [parcel, setParcel] = useState<Parcel | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // WhatsApp opt-in state
  const [waStep, setWaStep] = useState<'idle' | 'step1_tapped' | 'confirmed' | 'error'>('idle')
  const [waError, setWaError] = useState('')
  const [optInLoading, setOptInLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setNotFound(false)
    setError('')
    setParcel(null)
    setWaStep('idle')

    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(query.trim())}`)
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      if (!res.ok) throw new Error('Server error')
      const data = await res.json()
      setParcel(data)
      if (data.whatsappOptedIn) setWaStep('confirmed')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsAppStep1 = () => {
    const number = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER ?? '+14155238886'
    const rawCode = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_JOIN_CODE ?? 'twilio-trial'
    const code = rawCode.replace(/^join\s+/i, '').trim()
    const url = `https://wa.me/${number.replace('+', '')}?text=join%20${encodeURIComponent(code)}`
    window.open(url, '_blank')
    setWaStep('step1_tapped')
  }

  const handleWhatsAppConfirm = async () => {
    if (!parcel) return
    setOptInLoading(true)
    setWaError('')
    try {
      const res = await fetch(`/api/parcels/${parcel.waybillId}/whatsapp-optin`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to activate')
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

  const inputStyle = {
    padding: '14px 16px',
    border: '2px solid #d0cbc4',
    backgroundColor: 'white',
    fontFamily: 'IBM Plex Sans, sans-serif',
    fontSize: '16px',
    color: '#1A1A1A',
    outline: 'none',
    width: '100%',
    letterSpacing: '0.05em',
    fontVariantNumeric: 'tabular-nums' as const,
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F2EE', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#0B6157', color: 'white', padding: '16px 24px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>PettiVandi · KSRTC</div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Track Your Parcel</h1>
          </div>
          <a href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', textDecoration: 'none' }}>← Home</a>
        </div>
      </header>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Search form */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0', marginBottom: '40px' }}>
          <input
            style={inputStyle}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter waybill ID, e.g. PV-2026-1234ABC"
            autoCorrect="off"
            autoCapitalize="characters"
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px 24px', backgroundColor: loading ? '#7A8694' : '#0B6157',
              color: 'white', border: 'none', fontFamily: 'IBM Plex Sans, sans-serif',
              fontWeight: 700, fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? '…' : 'Track'}
          </button>
        </form>

        {/* Not found */}
        {notFound && (
          <div style={{ padding: '24px', backgroundColor: 'white', border: '1.5px solid #e8e3dc', color: '#1A1A1A' }}>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 500 }}>No parcel found with that ID — check the number and try again.</p>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#7A8694' }}>Waybill IDs look like: PV-2026-1234ABC</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '16px', backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', color: '#dc2626', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* Result */}
        {parcel && (
          <div>
            {/* Parcel summary */}
            <div style={{ backgroundColor: 'white', border: '1.5px solid #e8e3dc', padding: '24px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A8694', letterSpacing: '0.1em', marginBottom: '4px' }}>WAYBILL</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#0B6157' }}>{parcel.waybillId}</div>
                </div>
                <div style={{
                  padding: '6px 14px',
                  backgroundColor: parcel.status === 'CLAIMED' ? '#0B6157' :
                                   parcel.status === 'UNLOADED' ? 'rgba(11,97,87,0.1)' : 'rgba(232,130,12,0.1)',
                  color: parcel.status === 'CLAIMED' ? 'white' :
                         parcel.status === 'UNLOADED' ? '#0B6157' : '#E8820C',
                  fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em',
                }}>
                  {STATUS_LABELS[parcel.status] ?? parcel.status}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                {[
                  ['Route', parcel.trip.routeName],
                  ['Bus', parcel.trip.busNumber],
                  ['From', parcel.trip.departureDepot],
                  ['To', parcel.trip.arrivalDepot],
                  ['Weight', `${parcel.weightKg} kg`],
                  ['Fare', `₹${parcel.calculatedFare.toFixed(2)}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: '10px', color: '#7A8694', letterSpacing: '0.1em', marginBottom: '2px' }}>{label.toUpperCase()}</div>
                    <div style={{ fontWeight: 500, color: '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status timeline */}
            <h2 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', color: '#7A8694', marginBottom: '20px' }}>JOURNEY</h2>
            <StatusTimeline statusLogs={parcel.statusLogs} currentStatus={parcel.status} />

            {/* WhatsApp opt-in — two step flow */}
            <div style={{ marginTop: '32px', padding: '20px', backgroundColor: 'white', border: '1.5px solid #e8e3dc' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Status Notifications</div>

              {waStep === 'idle' && (
                <button
                  onClick={handleWhatsAppStep1}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 20px', backgroundColor: '#0B6157', color: 'white',
                    border: 'none', fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 600,
                    fontSize: '14px', cursor: 'pointer', width: '100%',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>💬</span>
                  Get updates on WhatsApp
                </button>
              )}

              {waStep === 'step1_tapped' && (
                <div>
                  <p style={{ fontSize: '13px', color: '#1A1A1A', marginBottom: '16px', lineHeight: 1.5 }}>
                    Once you've sent the join message in WhatsApp, tap below to activate updates.
                  </p>
                  <button
                    onClick={handleWhatsAppConfirm}
                    disabled={optInLoading}
                    style={{
                      padding: '12px 20px', backgroundColor: optInLoading ? '#7A8694' : '#0B6157',
                      color: 'white', border: 'none', fontFamily: 'IBM Plex Sans, sans-serif',
                      fontWeight: 600, fontSize: '14px', cursor: optInLoading ? 'not-allowed' : 'pointer',
                      width: '100%',
                    }}
                  >
                    {optInLoading ? 'Activating…' : 'Yes, activate updates'}
                  </button>
                  <button
                    onClick={handleWhatsAppStep1}
                    style={{
                      marginTop: '8px', padding: '10px', backgroundColor: 'transparent',
                      color: '#7A8694', border: '1px solid #d0cbc4', fontFamily: 'IBM Plex Sans, sans-serif',
                      fontSize: '12px', cursor: 'pointer', width: '100%',
                    }}
                  >
                    Re-open WhatsApp
                  </button>
                </div>
              )}

              {waStep === 'confirmed' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0B6157', fontSize: '14px', fontWeight: 600 }}>
                  <span style={{ fontSize: '20px' }}>✓</span>
                  WhatsApp updates activated for this parcel.
                </div>
              )}

              {waStep === 'error' && (
                <div>
                  <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{waError}</div>
                  <button
                    onClick={handleWhatsAppConfirm}
                    style={{ padding: '10px 16px', backgroundColor: '#0B6157', color: 'white', border: 'none', fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
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
