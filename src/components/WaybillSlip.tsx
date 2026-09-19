'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface Trip {
  routeName: string
  busNumber: string
  departureDepot: string
  arrivalDepot: string
  scheduledDeparture: string
  distanceKm: number
}

interface WaybillSlipProps {
  parcel: {
    waybillId: string
    senderName: string
    receiverName: string
    weightKg: number
    calculatedFare: number
    trip: Trip
  }
}

export default function WaybillSlip({ parcel }: WaybillSlipProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const slipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    QRCode.toDataURL(parcel.waybillId, {
      width: 160,
      margin: 1,
      color: { dark: '#0B6157', light: '#FFFFFF' },
    }).then(setQrDataUrl)
  }, [parcel.waybillId])

  const handlePrint = () => window.print()

  const deptDate = new Date(parcel.trip.scheduledDeparture).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .waybill-print-root { display: block !important; }
          .waybill-print-root .no-print { display: none !important; }
        }
      `}</style>

      <div className="waybill-print-root">
        {/* The slip itself */}
        <div
          ref={slipRef}
          style={{
            backgroundColor: '#0B6157',
            color: '#FFFFFF',
            width: '320px',
            minHeight: '520px',
            padding: '20px',
            fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
            position: 'relative',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', opacity: 0.7 }}>KSRTC</div>
              <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.1 }}>PettiVandi</div>
              <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '2px' }}>PARCEL SERVICE</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '9px', opacity: 0.7 }}>
              <div>WAYBILL</div>
            </div>
          </div>

          {/* Waybill ID — hero element */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.3)',
            borderBottom: '1px solid rgba(255,255,255,0.3)',
            padding: '12px 0',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '9px', opacity: 0.6, letterSpacing: '0.15em', marginBottom: '4px' }}>WAYBILL ID</div>
            <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>
              {parcel.waybillId}
            </div>
          </div>

          {/* QR Code */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            {qrDataUrl ? (
              <div style={{ backgroundColor: '#FFFFFF', padding: '8px', display: 'inline-block' }}>
                <img src={qrDataUrl} alt={`QR for ${parcel.waybillId}`} style={{ display: 'block', width: '120px', height: '120px' }} />
              </div>
            ) : (
              <div style={{ width: '136px', height: '136px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
            )}
          </div>

          {/* Route */}
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.2)',
            padding: '10px 12px',
            marginBottom: '12px',
            fontSize: '11px',
          }}>
            <div style={{ opacity: 0.6, fontSize: '9px', letterSpacing: '0.1em', marginBottom: '4px' }}>ROUTE</div>
            <div style={{ fontWeight: 600 }}>{parcel.trip.routeName}</div>
            <div style={{ opacity: 0.7, marginTop: '2px' }}>Bus: {parcel.trip.busNumber}</div>
            <div style={{ opacity: 0.6, marginTop: '2px', fontSize: '9px' }}>{deptDate}</div>
          </div>

          {/* Details table */}
          <div style={{ fontSize: '10px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            {[
              ['FROM', parcel.senderName],
              ['TO', parcel.receiverName],
              ['WEIGHT', `${parcel.weightKg} kg`],
              ['FARE', `₹${parcel.calculatedFare.toFixed(2)}`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ opacity: 0.6, letterSpacing: '0.08em' }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '8px', opacity: 0.4 }}>
            Kerala State Road Transport Corporation
          </div>
        </div>

        {/* Print button — hidden in print */}
        <button
          onClick={handlePrint}
          className="no-print"
          style={{
            marginTop: '12px',
            padding: '10px 24px',
            backgroundColor: '#0B6157',
            color: 'white',
            border: 'none',
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'block',
            width: '320px',
          }}
        >
          🖨 Print Waybill
        </button>
      </div>
    </div>
  )
}
