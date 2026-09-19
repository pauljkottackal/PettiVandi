'use client'

import { useState, useEffect, useCallback } from 'react'
import WaybillSlip from '@/components/WaybillSlip'

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

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #d0cbc4',
    backgroundColor: '#fff',
    fontFamily: 'IBM Plex Sans, sans-serif',
    fontSize: '14px',
    color: '#1A1A1A',
    outline: 'none',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: '#7A8694',
    marginBottom: '6px',
    textTransform: 'uppercase' as const,
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F2EE' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#0B6157', color: 'white', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>PettiVandi · KSRTC</div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Depot Clerk</h1>
          </div>
          <a href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', textDecoration: 'none' }}>← Home</a>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '48px', alignItems: 'start' }}>
          {/* Left: Form */}
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px', color: '#1A1A1A' }}>Book New Parcel</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Sender */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Sender Name</label>
                  <input style={inputStyle} value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} required placeholder="Rajan K." />
                </div>
                <div>
                  <label style={labelStyle}>Sender Phone</label>
                  <input style={inputStyle} value={form.senderPhone} onChange={(e) => setForm({ ...form, senderPhone: e.target.value })} required placeholder="+919876543210" type="tel" />
                </div>
              </div>

              {/* Receiver */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Receiver Name</label>
                  <input style={inputStyle} value={form.receiverName} onChange={(e) => setForm({ ...form, receiverName: e.target.value })} required placeholder="Meera S." />
                </div>
                <div>
                  <label style={labelStyle}>Receiver Phone</label>
                  <input style={inputStyle} value={form.receiverPhone} onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })} required placeholder="+919876543211" type="tel" />
                </div>
              </div>

              {/* Weight + Description */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Weight (kg)</label>
                  <input style={inputStyle} type="number" step="0.1" min="0.1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} required placeholder="2.5" />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <input style={inputStyle} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Electronics, Documents" />
                </div>
              </div>

              {/* Trip selector */}
              <div>
                <label style={labelStyle}>Assign Trip</label>
                <select style={{ ...inputStyle, appearance: 'none' }} value={form.tripId} onChange={(e) => setForm({ ...form, tripId: e.target.value })} required>
                  <option value="">Select a route…</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.routeName} — Bus {t.busNumber} ({t.distanceKm}km)
                    </option>
                  ))}
                </select>
              </div>

              {/* Live fare display */}
              {liveFare !== null && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px', backgroundColor: 'rgba(11,97,87,0.08)', borderLeft: '3px solid #0B6157',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0B6157' }}>Calculated Fare</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: '#E8820C', fontVariantNumeric: 'tabular-nums' }}>₹{liveFare.toFixed(2)}</span>
                </div>
              )}

              {error && (
                <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: '13px' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '14px 24px', backgroundColor: loading ? '#7A8694' : '#0B6157',
                  color: 'white', border: 'none', fontFamily: 'IBM Plex Sans, sans-serif',
                  fontWeight: 700, fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                {loading ? 'Booking…' : 'Book Parcel & Generate Waybill'}
              </button>
            </form>
          </div>

          {/* Right: Waybill slip */}
          <div style={{ position: 'sticky', top: '32px' }}>
            {createdParcel ? (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#0B6157', marginBottom: '12px', letterSpacing: '0.05em' }}>✓ PARCEL BOOKED</div>
                <WaybillSlip parcel={createdParcel} />
                <button
                  onClick={() => setCreatedParcel(null)}
                  style={{
                    marginTop: '8px', padding: '10px 24px', backgroundColor: 'transparent',
                    color: '#7A8694', border: '1.5px solid #7A8694', fontFamily: 'IBM Plex Sans, sans-serif',
                    fontWeight: 600, fontSize: '13px', cursor: 'pointer', width: '320px',
                  }}
                >
                  Book Another Parcel
                </button>
              </div>
            ) : (
              <div style={{
                width: '320px', minHeight: '520px', border: '2px dashed #d0cbc4',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: '#7A8694', fontSize: '13px', gap: '8px',
              }}>
                <span style={{ fontSize: '32px' }}>📦</span>
                <span>Waybill will appear here</span>
              </div>
            )}
          </div>
        </div>

        {/* Booked parcels list */}
        <div style={{ marginTop: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Awaiting Load — {bookedParcels.length} parcel(s)</h2>
            <button onClick={fetchData} style={{ fontSize: '12px', color: '#7A8694', background: 'none', border: 'none', cursor: 'pointer' }}>↻ Refresh</button>
          </div>

          {bookedParcels.length === 0 ? (
            <p style={{ color: '#7A8694', fontSize: '13px' }}>No parcels waiting to be loaded.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #1A1A1A' }}>
                    {['Waybill ID', 'Sender', 'Receiver', 'Weight', 'Route', 'Fare', 'Booked At'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#7A8694', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookedParcels.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #e8e3dc' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#0B6157' }}>{p.waybillId}</td>
                      <td style={{ padding: '10px 12px' }}>{p.senderName}</td>
                      <td style={{ padding: '10px 12px' }}>{p.receiverName}</td>
                      <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>{p.weightKg} kg</td>
                      <td style={{ padding: '10px 12px', color: '#7A8694' }}>{p.trip?.routeName ?? '—'}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#E8820C', fontVariantNumeric: 'tabular-nums' }}>₹{p.calculatedFare.toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', color: '#7A8694', whiteSpace: 'nowrap' }}>{new Date(p.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
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
