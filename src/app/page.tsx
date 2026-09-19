'use client'

import { useState, useEffect, useRef } from 'react'
import Navbar from '@/components/Navbar'
import StatusTimeline from '@/components/StatusTimeline'
import { BusLogo, BusTransitIcon, DepotIcon } from '@/components/BusIcons'

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

export default function Home() {
  // Scroll-linked bus progress state (Hero section ONLY)
  const heroRef = useRef<HTMLDivElement>(null)
  const [busProgress, setBusProgress] = useState(12)

  // Tracking section state (Embedded directly on landing page)
  const [query, setQuery] = useState('PV-2026-5258WOG')
  const [parcel, setParcel] = useState<Parcel | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // WhatsApp opt-in state (Two-Step Flow)
  const [waStep, setWaStep] = useState<'idle' | 'step1_tapped' | 'confirmed' | 'error'>('idle')
  const [waError, setWaError] = useState('')
  const [optInLoading, setOptInLoading] = useState(false)

  // Scroll listener for hero bus movement
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setBusProgress(50)
      return
    }

    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (heroRef.current) {
            const rect = heroRef.current.getBoundingClientRect()
            const scrollDistance = -rect.top
            const maxScroll = rect.height
            const rawRatio = Math.max(0, Math.min(1, scrollDistance / (maxScroll || 1)))
            // Map 0 -> 1 progress to bus percentage (12% at origin -> 88% at destination)
            const calculatedPercent = 12 + rawRatio * 76
            setBusProgress(calculatedPercent)
          }
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-load sample parcel on mount for instant demonstration
  useEffect(() => {
    performSearch('PV-2026-5258WOG')
  }, [])

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
      setError('Unable to fetch tracking data. Verify the consignment ID and retry.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(query)
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0A0A0A', color: '#EDEDED' }}>
      {/* 1. PERSISTENT TOP NAVIGATION BAR */}
      <Navbar />

      {/* 2. HERO SECTION WITH SCROLL-LINKED BUS GRAPHIC */}
      <section
        ref={heroRef}
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(180deg, #131514 0%, #0A0A0A 100%)',
          padding: '56px 24px 48px',
        }}
      >
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ maxWidth: '720px', marginBottom: '36px' }}>
            <div
              className="font-mono"
              style={{
                display: 'inline-block',
                fontSize: '11px',
                color: '#3ECF8E',
                backgroundColor: 'rgba(62, 207, 142, 0.1)',
                border: '1px solid rgba(62, 207, 142, 0.25)',
                padding: '4px 10px',
                borderRadius: '4px',
                marginBottom: '16px',
                letterSpacing: '0.06em',
              }}
            >
              KERALA STATE ROAD TRANSPORT CORPORATION · COURIER NETWORK
            </div>

            <h1
              style={{
                fontSize: '38px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                margin: '0 0 16px',
                color: '#EDEDED',
              }}
            >
              Parcel booking &amp; tracking on scheduled state buses.
            </h1>

            <p style={{ fontSize: '16px', color: '#A0A0A0', lineHeight: 1.55, margin: '0 0 28px' }}>
              PettiVandi digitizes KSRTC’s existing counter parcel service. Consignments travel in the luggage hold of
              scheduled passenger buses, tracked through a strict physical custody state machine with automated WhatsApp updates.
            </p>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <a
                href="#track"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3ECF8E',
                  color: '#0A0A0A',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '14px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Track a Parcel</span>
                <span>↓</span>
              </a>

              <a
                href="#how-it-works"
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#1C1C1C',
                  color: '#EDEDED',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                How It Works →
              </a>
            </div>
          </div>

          {/* SCROLL-LINKED ROUTE COMPONENT */}
          <div
            style={{
              backgroundColor: '#1C1C1C',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '24px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DepotIcon size={20} color="#3ECF8E" />
                <div>
                  <div style={{ fontSize: '10px', color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    ORIGIN DEPOT
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#EDEDED' }}>Angamaly Bus Stand</div>
                </div>
              </div>

              <div
                className="font-mono"
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(62, 207, 142, 0.1)',
                  color: '#3ECF8E',
                  border: '1px solid rgba(62, 207, 142, 0.25)',
                }}
              >
                LIVE ROUTE TRANSIT: BUS KL-07-1234 (25 KM)
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'right' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    DESTINATION DEPOT
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#EDEDED' }}>Ernakulam (High Court)</div>
                </div>
                <DepotIcon size={20} color="#A0A0A0" />
              </div>
            </div>

            {/* Highway Route Track Line with Scroll-Linked Bus */}
            <div style={{ position: 'relative', height: '54px', display: 'flex', alignItems: 'center', margin: '6px 0' }}>
              {/* Road line background */}
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  right: '12px',
                  height: '4px',
                  backgroundColor: '#141414',
                  borderRadius: '2px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              />

              {/* Progress bar in Supabase Green */}
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  width: `calc(${busProgress}% - 12px)`,
                  height: '4px',
                  backgroundColor: '#3ECF8E',
                  borderRadius: '2px',
                  transition: 'width 0.15s ease-out',
                }}
              />

              {/* The Scroll-Linked Bus Icon */}
              <div
                style={{
                  position: 'absolute',
                  left: `${busProgress}%`,
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'left 0.15s ease-out',
                  zIndex: 3,
                }}
              >
                <BusTransitIcon size={46} color="#3ECF8E" />
                <span
                  className="font-mono"
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#E8820C',
                    letterSpacing: '0.05em',
                    marginTop: '2px',
                    backgroundColor: '#141414',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  SCROLL PROGRESS
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#A0A0A0', marginTop: '12px' }}>
              <span className="font-mono">Depot Counter (0 km)</span>
              <span style={{ fontSize: '11px', color: '#666666', fontStyle: 'italic' }}>
                ↓ Scroll page down to see bus travel to destination
              </span>
              <span className="font-mono">Arrival Hub (25 km)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRACKING SECTION (#track) - THE CORE FUNCTIONAL HUB */}
      <section id="track" style={{ padding: '64px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div
              className="font-mono"
              style={{
                fontSize: '11px',
                color: '#3ECF8E',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              PUBLIC CONSIGNMENT LOOKUP
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#EDEDED', margin: '0 0 8px' }}>
              Track Parcel Custody in Real-Time
            </h2>
            <p style={{ fontSize: '14px', color: '#A0A0A0', margin: 0 }}>
              Enter your waybill number to inspect live physical custody handoffs across bus routes.
            </p>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <input
              className="pv-input font-mono"
              style={{ fontSize: '15px', padding: '14px 18px' }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. PV-2026-5258WOG"
              autoCorrect="off"
              autoCapitalize="characters"
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px 26px',
                backgroundColor: loading ? '#555555' : '#3ECF8E',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'Locating…' : 'Track Parcel →'}
            </button>
          </form>

          {/* Demo sample waybill prompt */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#A0A0A0', marginBottom: '32px' }}>
            <span>Try sample waybill:</span>
            <button
              type="button"
              onClick={() => {
                setQuery('PV-2026-5258WOG')
                performSearch('PV-2026-5258WOG')
              }}
              className="font-mono"
              style={{
                background: '#1C1C1C',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#3ECF8E',
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              PV-2026-5258WOG
            </button>
          </div>

          {/* Not Found Panel */}
          {notFound && (
            <div
              style={{
                padding: '24px',
                backgroundColor: '#1C1C1C',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                marginBottom: '28px',
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

          {/* Inline Parcel Result View */}
          {parcel && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Summary Card */}
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
                    <div style={{ fontSize: '10px', color: '#A0A0A0', letterSpacing: '0.1em' }}>CONSIGNMENT NUMBER</div>
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

                {/* Details Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
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
                    ['WEIGHT', `${parcel.weightKg} kg`, true],
                    ['STAGE FARE', `₹${parcel.calculatedFare.toFixed(2)}`, true],
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
                          color: label === 'STAGE FARE' ? '#E8820C' : '#EDEDED',
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Route and Timeline with Functional Bus */}
              <div>
                <div style={{ fontSize: '11px', color: '#A0A0A0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  PHYSICAL CUSTODY TIMELINE
                </div>
                <StatusTimeline
                  statusLogs={parcel.statusLogs}
                  currentStatus={parcel.status}
                  departureDepot={parcel.trip.departureDepot}
                  arrivalDepot={parcel.trip.arrivalDepot}
                  busNumber={parcel.trip.busNumber}
                />
              </div>

              {/* Two-Step WhatsApp Notification Box */}
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
                    WhatsApp Transit Alerts
                  </span>
                </div>

                {waStep === 'idle' && (
                  <div>
                    <p style={{ fontSize: '13px', color: '#A0A0A0', marginBottom: '16px', lineHeight: 1.4 }}>
                      Get instant alerts on WhatsApp when this consignment is loaded, departs on the highway, and lands at the arrival counter.
                    </p>
                    <button
                      onClick={handleWhatsAppStep1}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '11px 20px',
                        backgroundColor: '#3ECF8E',
                        color: '#0A0A0A',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      <span>💬</span> Opt-in for WhatsApp Updates →
                    </button>
                  </div>
                )}

                {waStep === 'step1_tapped' && (
                  <div
                    style={{
                      backgroundColor: '#141414',
                      border: '1px solid rgba(62, 207, 142, 0.25)',
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
                    WhatsApp courier updates are activated for this consignment.
                  </div>
                )}

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
      </section>

      {/* 4. "HOW IT WORKS" SECTION (#how-it-works) */}
      <section id="how-it-works" style={{ padding: '64px 24px', backgroundColor: '#0D0D0D', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <div
              className="font-mono"
              style={{
                fontSize: '11px',
                color: '#3ECF8E',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              CITIZEN WORKFLOW
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#EDEDED', margin: '0 0 8px' }}>
              How KSRTC PettiVandi Works
            </h2>
            <p style={{ fontSize: '14px', color: '#A0A0A0', margin: 0 }}>
              Three straightforward steps from depot counter drop-off to destination collection.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {/* Step 1 */}
            <div
              className="pv-card"
              style={{
                backgroundColor: '#141414',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '28px 24px',
              }}
            >
              <div
                className="font-mono"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(62, 207, 142, 0.1)',
                  color: '#3ECF8E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  marginBottom: '16px',
                  border: '1px solid rgba(62, 207, 142, 0.25)',
                }}
              >
                01
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#EDEDED', margin: '0 0 10px' }}>
                Book at Depot Counter
              </h3>
              <p style={{ fontSize: '13px', color: '#A0A0A0', lineHeight: 1.5, margin: 0 }}>
                Bring your consignment to any KSRTC bus stand counter. Staff weigh it, compute dynamic route-band fares, and affix an official 80mm QR waybill tag.
              </p>
            </div>

            {/* Step 2 */}
            <div
              className="pv-card"
              style={{
                backgroundColor: '#141414',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '28px 24px',
              }}
            >
              <div
                className="font-mono"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(232, 130, 12, 0.1)',
                  color: '#E8820C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  marginBottom: '16px',
                  border: '1px solid rgba(232, 130, 12, 0.25)',
                }}
              >
                02
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#EDEDED', margin: '0 0 10px' }}>
                Track Bus Hold Transit
              </h3>
              <p style={{ fontSize: '13px', color: '#A0A0A0', lineHeight: 1.5, margin: 0 }}>
                Conductors scan the luggage QR into the bus hold upon boarding. The strict custody state machine guarantees no transitions can be forged or skipped.
              </p>
            </div>

            {/* Step 3 */}
            <div
              className="pv-card"
              style={{
                backgroundColor: '#141414',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '28px 24px',
              }}
            >
              <div
                className="font-mono"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(62, 207, 142, 0.1)',
                  color: '#3ECF8E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  marginBottom: '16px',
                  border: '1px solid rgba(62, 207, 142, 0.25)',
                }}
              >
                03
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#EDEDED', margin: '0 0 10px' }}>
                WhatsApp Arrival Alerts
              </h3>
              <p style={{ fontSize: '13px', color: '#A0A0A0', lineHeight: 1.5, margin: 0 }}>
                Receivers receive automated WhatsApp alerts as the bus progresses and unloads at the destination depot counter for secure physical collection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PUBLIC SERVICE FOOTER */}
      <footer style={{ padding: '36px 24px', backgroundColor: '#0A0A0A', marginTop: 'auto' }}>
        <div
          style={{
            maxWidth: '1140px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BusLogo size={20} color="#3ECF8E" />
            <span style={{ fontSize: '13px', color: '#A0A0A0' }}>
              Kerala State Road Transport Corporation · PettiVandi Digitized Logistics
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#777777' }}>
            <span>Manual Service Digitization Prototype</span>
            <span>·</span>
            <span>PostgreSQL &amp; Prisma ORM</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
