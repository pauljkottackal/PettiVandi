'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BusLogo } from '@/components/BusIcons'

export default function Navbar() {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'depot' | 'conductor'>('depot')

  // Depot form
  const [depotUser, setDepotUser] = useState('')
  const [depotPass, setDepotPass] = useState('')
  const [depotError, setDepotError] = useState('')

  // Conductor form
  const [condUser, setCondUser] = useState('')
  const [condPass, setCondPass] = useState('')
  const [condError, setCondError] = useState('')

  const modalRef = useRef<HTMLDivElement>(null)

  // Close modal on Escape or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false)
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setModalOpen(false)
      }
    }
    if (modalOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [modalOpen])

  const handleDepotLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setDepotError('')
    if (depotUser.trim().toLowerCase() === 'depot' && depotPass === 'depot123') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pettivandi_role', 'depot')
        document.cookie = 'pettivandi_role=depot; path=/; max-age=86400'
      }
      setModalOpen(false)
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
      setModalOpen(false)
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

  return (
    <header
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: '#0A0A0A',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1140px',
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Left: Wordmark + Bus Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <BusLogo size={24} color="#3ECF8E" />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#EDEDED', letterSpacing: '-0.02em' }}>
              PettiVandi
            </span>
            <span
              className="font-mono"
              style={{ fontSize: '10px', color: '#3ECF8E', fontWeight: 600, letterSpacing: '0.04em' }}
            >
              KSRTC PARCEL
            </span>
          </div>
        </Link>

        {/* Center: Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link
            href="/#how-it-works"
            style={{
              fontSize: '13px',
              color: '#A0A0A0',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#EDEDED')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#A0A0A0')}
          >
            How it works
          </Link>
          <Link
            href="/#track"
            style={{
              fontSize: '13px',
              color: '#A0A0A0',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#EDEDED')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#A0A0A0')}
          >
            Track a Parcel
          </Link>
        </nav>

        {/* Right: Staff Sign-In Button */}
        <div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              backgroundColor: '#1C1C1C',
              color: '#EDEDED',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, background-color 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#3ECF8E'
              e.currentTarget.style.backgroundColor = '#161918'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
              e.currentTarget.style.backgroundColor = '#1C1C1C'
            }}
          >
            <span style={{ fontSize: '12px' }}>🔒</span>
            <span>Staff Sign In</span>
            <span style={{ fontSize: '10px', color: '#A0A0A0' }}>▾</span>
          </button>
        </div>
      </div>

      {/* Staff Sign-In Modal / Dialog */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            ref={modalRef}
            style={{
              width: '100%',
              maxWidth: '400px',
              backgroundColor: '#1C1C1C',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#EDEDED' }}>
                  KSRTC Operational Sign In
                </h3>
                <div style={{ fontSize: '11px', color: '#A0A0A0', marginTop: '2px' }}>
                  Restricted staff portal for parcel custody operations
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#A0A0A0',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Role Tab Selector */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                backgroundColor: '#141414',
                padding: '4px',
                borderRadius: '6px',
                marginBottom: '18px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab('depot')
                  setDepotError('')
                }}
                style={{
                  padding: '8px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: activeTab === 'depot' ? '#1C1C1C' : 'transparent',
                  color: activeTab === 'depot' ? '#3ECF8E' : '#A0A0A0',
                  fontWeight: activeTab === 'depot' ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  borderBottom: activeTab === 'depot' ? '2px solid #3ECF8E' : 'none',
                }}
              >
                📦 Depot Clerk
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('conductor')
                  setCondError('')
                }}
                style={{
                  padding: '8px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: activeTab === 'conductor' ? '#1C1C1C' : 'transparent',
                  color: activeTab === 'conductor' ? '#E8820C' : '#A0A0A0',
                  fontWeight: activeTab === 'conductor' ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  borderBottom: activeTab === 'conductor' ? '2px solid #E8820C' : 'none',
                }}
              >
                🚌 Conductor
              </button>
            </div>

            {/* TAB 1: DEPOT CLERK LOGIN */}
            {activeTab === 'depot' && (
              <form onSubmit={handleDepotLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#A0A0A0', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '4px' }}>
                    STAFF USERNAME
                  </label>
                  <input
                    className="pv-input font-mono"
                    value={depotUser}
                    onChange={(e) => setDepotUser(e.target.value)}
                    placeholder="depot"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#A0A0A0', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '4px' }}>
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    className="pv-input font-mono"
                    value={depotPass}
                    onChange={(e) => setDepotPass(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                {depotError && (
                  <div className="font-mono" style={{ fontSize: '11px', color: '#ff6b6b', backgroundColor: '#261212', padding: '6px 8px', borderRadius: '4px', border: '1px solid #732222' }}>
                    {depotError}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    padding: '11px',
                    backgroundColor: '#3ECF8E',
                    color: '#0A0A0A',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  Access Depot Console →
                </button>

                {/* Demo shortcut */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="font-mono" style={{ fontSize: '10px', color: '#777777' }}>DEMO SHORTCUT:</span>
                  <button
                    type="button"
                    onClick={fillDepotDemo}
                    className="font-mono"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '10px',
                      color: '#3ECF8E',
                      cursor: 'pointer',
                    }}
                  >
                    Autofill (depot / depot123)
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: CONDUCTOR LOGIN */}
            {activeTab === 'conductor' && (
              <form onSubmit={handleCondLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#A0A0A0', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '4px' }}>
                    CONDUCTOR ID
                  </label>
                  <input
                    className="pv-input font-mono"
                    value={condUser}
                    onChange={(e) => setCondUser(e.target.value)}
                    placeholder="conductor"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#A0A0A0', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '4px' }}>
                    PIN / PASSWORD
                  </label>
                  <input
                    type="password"
                    className="pv-input font-mono"
                    value={condPass}
                    onChange={(e) => setCondPass(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                {condError && (
                  <div className="font-mono" style={{ fontSize: '11px', color: '#ff6b6b', backgroundColor: '#261212', padding: '6px 8px', borderRadius: '4px', border: '1px solid #732222' }}>
                    {condError}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    padding: '11px',
                    backgroundColor: '#E8820C',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  Access Mobile Scanner →
                </button>

                {/* Demo shortcut */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="font-mono" style={{ fontSize: '10px', color: '#777777' }}>DEMO SHORTCUT:</span>
                  <button
                    type="button"
                    onClick={fillCondDemo}
                    className="font-mono"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '10px',
                      color: '#E8820C',
                      cursor: 'pointer',
                    }}
                  >
                    Autofill (conductor / conductor123)
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
