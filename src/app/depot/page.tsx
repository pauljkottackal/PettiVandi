'use client'

import { useState, useEffect, useCallback } from 'react'
import WaybillSlip from '@/components/WaybillSlip'
import { BusLogo } from '@/components/BusIcons'

interface Trip {
  id: string
  routeName: string
  busNumber: string
  departureDepot: string
  arrivalDepot: string
  scheduledDeparture: string
  distanceKm: number
}

interface Parcel {
  id: string
  waybillId: string
  senderName: string
  senderPhone: string
  receiverName: string
  receiverPhone: string
  weightKg: number
  description: string
  calculatedFare: number
  status: string
  trip: Trip
  createdAt: string
}

function clientCalculateFare(weightKg: number, distanceKm: number): number {
  let multiplier = 1.0
  if (distanceKm >= 50 && distanceKm <= 100) multiplier = 1.3
  else if (distanceKm > 100) multiplier = 1.6
  return Math.round((20 + weightKg * 15) * multiplier * 100) / 100
}

export default function DepotPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [bookedParcels, setBookedParcels] = useState<Parcel[]>([])
  const [createdParcel, setCreatedParcel] = useState<Parcel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    senderName: '',
    senderPhone: '',
    receiverName: '',
    receiverPhone: '',
    weightKg: '',
    description: '',
    tripId: '',
  })

  const selectedTrip = trips.find((t) => t.id === form.tripId)
  const liveFare = selectedTrip && form.weightKg
    ? clientCalculateFare(parseFloat(form.weightKg), selectedTrip.distanceKm)
    : null

  const fetchData = useCallback(async () => {
    const [tripsRes, parcelsRes] = await Promise.all([
      fetch('/api/trips'),
      fetch('/api/parcels?status=BOOKED'),
    ])
    const tripsData = await tripsRes.json()
    const parcelsData = await parcelsRes.json()
    setTrips(tripsData)
    setBookedParcels(Array.isArray(parcelsData) ? parcelsData : [])
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/parcels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          weightKg: parseFloat(form.weightKg),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create parcel')
      setCreatedParcel(data)
      setForm({ senderName: '', senderPhone: '', receiverName: '', receiverPhone: '', weightKg: '', description: '', tripId: '' })
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const labelStyle = {
    display: 'block',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: '#A0A0A0',
    marginBottom: '6px',
    textTransform: 'uppercase' as const,
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#EDEDED', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#0A0A0A', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BusLogo size={22} color="#3ECF8E" />
            <div>
              <div style={{ fontSize: '11px', color: '#3ECF8E', fontWeight: 600, letterSpacing: '0.05em' }}>KSRTC PETTIVANDI</div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#EDEDED' }}>Depot Counter Terminal</h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="font-mono" style={{ fontSize: '11px', color: '#A0A0A0' }}>STATION DESK</span>
            <a href="/" style={{ color: '#A0A0A0', fontSize: '13px', textDecoration: 'none', padding: '5px 10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
              ← Switch Role
            </a>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '40px', alignItems: 'start' }}>
          
          {/* Left: Booking Form */}
          <div
            className="pv-card"
            style={{
              backgroundColor: '#1C1C1C',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#EDEDED' }}>Consignment Intake &amp; Waybill Generation</h2>
                <div style={{ fontSize: '12px', color: '#A0A0A0', marginTop: '2px' }}>Enter sender, receiver, and route to compute instant stage fare</div>
              </div>
              <span
                className="font-mono"
                style={{
                  fontSize: '11px',
                  color: '#3ECF8E',
                  backgroundColor: 'rgba(62, 207, 142, 0.1)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(62, 207, 142, 0.2)',
                }}
              >
                STATUS: BOOKED (INITIAL)
              </span>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Sender Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Sender Full Name</label>
                  <input
                    className="pv-input"
                    value={form.senderName}
                    onChange={(e) => setForm({ ...form, senderName: e.target.value })}
                    required
                    placeholder="Rajan K."
                  />
                </div>
                <div>
                  <label style={labelStyle}>Sender Mobile (SMS/Receipt)</label>
                  <input
                    className="pv-input font-mono"
                    value={form.senderPhone}
                    onChange={(e) => setForm({ ...form, senderPhone: e.target.value })}
                    required
                    placeholder="+919876543210"
                    type="tel"
                  />
                </div>
              </div>

              {/* Receiver Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Receiver Full Name</label>
                  <input
                    className="pv-input"
                    value={form.receiverName}
                    onChange={(e) => setForm({ ...form, receiverName: e.target.value })}
                    required
                    placeholder="Meera S."
                  />
                </div>
                <div>
                  <label style={labelStyle}>Receiver WhatsApp Phone</label>
                  <input
                    className="pv-input font-mono"
                    value={form.receiverPhone}
                    onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })}
                    required
                    placeholder="+919876543211"
                    type="tel"
                  />
                </div>
              </div>

              {/* Weight + Description */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Weight (kg)</label>
                  <input
                    className="pv-input font-mono"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={form.weightKg}
                    onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                    required
                    placeholder="2.5"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Parcel Contents / Notes</label>
                  <input
                    className="pv-input"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="e.g. Legal documents, machine spare"
                  />
                </div>
              </div>

              {/* Trip Selector */}
              <div>
                <label style={labelStyle}>Assign Bus Route &amp; Trip</label>
                <select
                  className="pv-input font-mono"
                  value={form.tripId}
                  onChange={(e) => setForm({ ...form, tripId: e.target.value })}
                  required
                  style={{ backgroundColor: '#141414', color: '#EDEDED' }}
                >
                  <option value="">Select an active KSRTC bus route…</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.routeName} — Bus {t.busNumber} ({t.distanceKm} km)
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Fare Display in Supabase/KSRTC Amber Accent */}
              {liveFare !== null && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    backgroundColor: '#141414',
                    borderRadius: '6px',
                    border: '1px solid rgba(232, 130, 12, 0.3)',
                    borderLeft: '4px solid #E8820C',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11px', color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      CALCULATED STAGE FARE
                    </span>
                    <div style={{ fontSize: '12px', color: '#EDEDED', marginTop: '2px' }}>
                      Base ₹20 + ({form.weightKg}kg × ₹15) × Band Multiplier
                    </div>
                  </div>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#E8820C',
                    }}
                  >
                    ₹{liveFare.toFixed(2)}
                  </span>
                </div>
              )}

              {error && (
                <div
                  className="font-mono"
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#241212',
                    border: '1px solid #732222',
                    borderRadius: '6px',
                    color: '#ff6b6b',
                    fontSize: '12px',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '13px 20px',
                  backgroundColor: loading ? '#555555' : '#3ECF8E',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'opacity 0.15s ease',
                }}
              >
                {loading ? 'Issuing Waybill…' : 'Issue Waybill & Assign to Hold →'}
              </button>
            </form>
          </div>

          {/* Right: Waybill Slip Preview */}
          <div style={{ position: 'sticky', top: '24px' }}>
            {createdParcel ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}
                >
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#3ECF8E',
                      letterSpacing: '0.05em',
                    }}
                  >
                    ✓ WAYBILL READY
                  </span>
                  <button
                    onClick={() => setCreatedParcel(null)}
                    style={{
                      fontSize: '11px',
                      color: '#A0A0A0',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Clear Preview
                  </button>
                </div>
                <WaybillSlip parcel={createdParcel} />
              </div>
            ) : (
              <div
                style={{
                  width: '320px',
                  minHeight: '480px',
                  border: '1px dashed rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  backgroundColor: '#141414',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#A0A0A0',
                  fontSize: '13px',
                  gap: '8px',
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '36px' }}>📦</span>
                <span style={{ color: '#EDEDED', fontWeight: 600 }}>Waybill Slip Preview</span>
                <span style={{ fontSize: '11px', color: '#777777', lineHeight: 1.4 }}>
                  Fill the intake form to render official KSRTC luggage QR slip here.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Manifest Table: Parcels Awaiting Bus Loading */}
        <div style={{ marginTop: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#EDEDED' }}>
                Manifest: Awaiting Bus Load ({bookedParcels.length})
              </h3>
              <div style={{ fontSize: '12px', color: '#A0A0A0' }}>Parcels currently at BOOKED status at this depot</div>
            </div>
            <button
              onClick={fetchData}
              className="font-mono"
              style={{
                fontSize: '11px',
                color: '#3ECF8E',
                background: 'transparent',
                border: '1px solid rgba(62, 207, 142, 0.25)',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ↻ Refresh Manifest
            </button>
          </div>

          {bookedParcels.length === 0 ? (
            <div
              style={{
                padding: '24px',
                backgroundColor: '#1C1C1C',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#A0A0A0',
                fontSize: '13px',
              }}
            >
              No parcels currently waiting at BOOKED status.
            </div>
          ) : (
            <div
              style={{
                overflowX: 'auto',
                backgroundColor: '#1C1C1C',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#141414' }}>
                    {['Waybill ID', 'Sender', 'Receiver', 'Weight', 'Route', 'Fare', 'Booked At'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '10px 14px',
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#A0A0A0',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookedParcels.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td
                        className="font-mono"
                        style={{
                          padding: '12px 14px',
                          fontWeight: 700,
                          color: '#3ECF8E',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {p.waybillId}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#EDEDED' }}>{p.senderName}</td>
                      <td style={{ padding: '12px 14px', color: '#EDEDED' }}>{p.receiverName}</td>
                      <td className="font-mono" style={{ padding: '12px 14px', color: '#A0A0A0' }}>
                        {p.weightKg} kg
                      </td>
                      <td style={{ padding: '12px 14px', color: '#A0A0A0' }}>{p.trip?.routeName ?? '—'}</td>
                      <td
                        className="font-mono"
                        style={{
                          padding: '12px 14px',
                          fontWeight: 600,
                          color: '#E8820C',
                        }}
                      >
                        ₹{p.calculatedFare.toFixed(2)}
                      </td>
                      <td className="font-mono" style={{ padding: '12px 14px', color: '#777777', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {new Date(p.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
