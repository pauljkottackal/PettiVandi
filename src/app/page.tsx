'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()

  // Depot Clerk Form State
  const [depotUser, setDepotUser] = useState('')
  const [depotPass, setDepotPass] = useState('')
  const [depotError, setDepotError] = useState('')

  // Conductor Form State
  const [condUser, setCondUser] = useState('')
  const [condPass, setCondPass] = useState('')
  const [condError, setCondError] = useState('')

  // Citizen direct search state
  const [trackWaybill, setTrackWaybill] = useState('')

  const handleDepotLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setDepotError('')
    if (depotUser.trim().toLowerCase() === 'depot' && depotPass === 'depot123') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pettivandi_role', 'depot')
        document.cookie = 'pettivandi_role=depot; path=/; max-age=86400'
      }
      router.push('/depot')
    } else {
      setDepotError('Invalid credentials. Use demo shortcut below.')
    }
  }

  const handleCondLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setCondError('')
    if (condUser.trim().toLowerCase() === 'conductor' && condPass === 'conductor123') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pettivandi_role', 'conductor')
        document.cookie = 'pettivandi_role=conductor; path=/; max-age=86400'
      }
      router.push('/conductor')
    } else {
      setCondError('Invalid credentials. Use demo shortcut below.')
    }
  }

  const fillDepotDemo = () => {
    setDepotUser('depot')
    setDepotPass('depot123')
    setDepotError('')
  }

  const fillCondDemo = () => {
    setCondUser('conductor')
    setCondPass('conductor123')
    setCondError('')
  }

  const handleCitizenSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (trackWaybill.trim()) {
      router.push(`/track?id=${encodeURIComponent(trackWaybill.trim())}`)
    } else {
      router.push('/track')
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '1.5px solid #d0cbc4',
    backgroundColor: '#FFFFFF',
    fontFamily: 'IBM Plex Sans, sans-serif',
    fontSize: '13px',
    color: '#1A1A1A',
    outline: 'none',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: '#7A8694',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F5F2EE' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#0B6157', color: 'white', padding: '24px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>PettiVandi</h1>
              <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>by KSRTC</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.85 }}>State Bus Parcel Booking &amp; Strict Custody Tracking</p>
          </div>

          <div style={{ backgroundColor: 'rgba(255,255,255,0.12)', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.25)', fontSize: '11px', letterSpacing: '0.05em' }}>
            DEMO MODE · SIMULATED ROLES
          </div>
        </div>
      </header>

      {/* Main Grid: 2 Login Cards + 1 Open Tracking Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '1100px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Select Station / Portal</h2>
            <p style={{ fontSize: '13px', color: '#7A8694', margin: '4px 0 0' }}>
              Sign in to operational roles using demo credentials, or access citizen tracking directly without login.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '24px' }}>
            
            {/* CARD 1: DEPOT CLERK (Login required) */}
            <div style={{ backgroundColor: '#FFFFFF', border: '2px solid #0B6157', padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📦</span>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0B6157' }}>Depot Clerk</h3>
                  <div style={{ fontSize: '11px', color: '#7A8694' }}>Booking Counter &amp; Loading Manifest</div>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#1A1A1A', marginBottom: '16px', lineHeight: 1.4 }}>
                Weigh consignments, calculate dynamic stage fares, and issue printable QR waybill slips.
              </p>

              <form onSubmit={handleDepotLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Staff ID</label>
                  <input
                    style={inputStyle}
                    value={depotUser}
                    onChange={(e) => setDepotUser(e.target.value)}
                    placeholder="e.g. depot"
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input
                    type="password"
                    style={inputStyle}
                    value={depotPass}
                    onChange={(e) => setDepotPass(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                {depotError && (
                  <div style={{ fontSize: '11px', color: '#dc2626', backgroundColor: '#fef2f2', padding: '6px 8px', border: '1px solid #fca5a5' }}>
                    {depotError}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    marginTop: '4px',
                    padding: '11px',
                    backgroundColor: '#0B6157',
                    color: 'white',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    letterSpacing: '0.02em',
                  }}
                >
                  Sign In to Depot Desk →
                </button>
              </form>

              {/* Demo shortcut note */}
              <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px dashed #e8e3dc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#7A8694', fontWeight: 600, letterSpacing: '0.05em' }}>DEMO SHORTCUT:</span>
                  <button
                    type="button"
                    onClick={fillDepotDemo}
                    style={{
                      background: '#F5F2EE',
                      border: '1px solid #d0cbc4',
                      padding: '3px 8px',
                      fontSize: '11px',
                      color: '#0B6157',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Autofill (depot / depot123)
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 2: CONDUCTOR (Login required) */}
            <div style={{ backgroundColor: '#1A1A1A', border: '2px solid #1A1A1A', color: '#FFFFFF', padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🚌</span>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>Conductor</h3>
                  <div style={{ fontSize: '11px', color: '#7A8694' }}>Mobile Scanner &amp; Custody Transition</div>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#d0cbc4', marginBottom: '16px', lineHeight: 1.4 }}>
                One-handed mobile scanner for in-bus custody verification and arrival depot handoff.
              </p>

              <form onSubmit={handleCondLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ ...labelStyle, color: '#A0AEC0' }}>Conductor ID</label>
                  <input
                    style={{ ...inputStyle, backgroundColor: '#2D3748', border: '1.5px solid #4A5568', color: '#FFFFFF' }}
                    value={condUser}
                    onChange={(e) => setCondUser(e.target.value)}
                    placeholder="e.g. conductor"
                    required
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: '#A0AEC0' }}>PIN / Password</label>
                  <input
                    type="password"
                    style={{ ...inputStyle, backgroundColor: '#2D3748', border: '1.5px solid #4A5568', color: '#FFFFFF' }}
                    value={condPass}
                    onChange={(e) => setCondPass(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                {condError && (
                  <div style={{ fontSize: '11px', color: '#ff6b6b', backgroundColor: '#3b1212', padding: '6px 8px', border: '1px solid #7f1d1d' }}>
                    {condError}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    marginTop: '4px',
                    padding: '11px',
                    backgroundColor: '#E8820C',
                    color: 'white',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    letterSpacing: '0.02em',
                  }}
                >
                  Open Scanner Console →
                </button>
              </form>

              {/* Demo shortcut note */}
              <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px dashed #4A5568' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#A0AEC0', fontWeight: 600, letterSpacing: '0.05em' }}>DEMO SHORTCUT:</span>
                  <button
                    type="button"
                    onClick={fillCondDemo}
                    style={{
                      background: '#2D3748',
                      border: '1px solid #4A5568',
                      padding: '3px 8px',
                      fontSize: '11px',
                      color: '#E8820C',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Autofill (conductor / conductor123)
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 3: CITIZEN TRACKING (Public - NO login required) */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #d0cbc4', padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📍</span>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#1A1A1A' }}>Citizen Tracking</h3>
                  <div style={{ fontSize: '11px', color: '#0B6157', fontWeight: 600 }}>Public Service · No Login Needed</div>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#7A8694', marginBottom: '20px', lineHeight: 1.4 }}>
                Track parcel movement live across Kerala state bus routes. Senders and receivers can follow custody handoffs with zero registration.
              </p>

              {/* Direct search form */}
              <form onSubmit={handleCitizenSearch} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Quick Consignment Search</label>
                  <input
                    style={inputStyle}
                    value={trackWaybill}
                    onChange={(e) => setTrackWaybill(e.target.value)}
                    placeholder="e.g. PV-2026-5258WOG"
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '11px',
                    backgroundColor: '#F5F2EE',
                    color: '#1A1A1A',
                    border: '1.5px solid #1A1A1A',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Track Parcel Journey →
                </button>
              </form>

              <div style={{ marginTop: 'auto', padding: '12px', backgroundColor: 'rgba(11,97,87,0.06)', borderLeft: '3px solid #0B6157' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#0B6157', marginBottom: '2px' }}>WhatsApp Notifications Included</div>
                <div style={{ fontSize: '11px', color: '#7A8694', lineHeight: 1.3 }}>
                  Opt-in with one click on the tracking page to receive status alerts at each transit hub.
                </div>
              </div>
            </div>

          </div>

          <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', color: '#7A8694' }}>
            Kerala State Road Transport Corporation · PettiVandi Digitized Logistics Platform
          </div>
        </div>
      </div>
    </main>
  )
}
