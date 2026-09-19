'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { BusLogo, BusTransitIcon } from '@/components/BusIcons'

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
  // Screen QR (high contrast on dark/screen)
  const [screenQr, setScreenQr] = useState<string>('')
  // Print QR (ultra high-res 512px for 80mm thermal/label printers)
  const [printQr, setPrintQr] = useState<string>('')

  useEffect(() => {
    // Screen display QR
    QRCode.toDataURL(parcel.waybillId, {
      width: 180,
      margin: 1,
      color: { dark: '#0A0A0A', light: '#FFFFFF' },
    }).then(setScreenQr)

    // Ultra high-res print QR (512px rendered down to ~32mm = ~400 DPI sharpness)
    QRCode.toDataURL(parcel.waybillId, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#FFFFFF' },
    }).then(setPrintQr)
  }, [parcel.waybillId])

  const handlePrint = () => {
    window.print()
  }

  const deptDate = new Date(parcel.trip.scheduledDeparture).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div>
      {/* 
        CRITICAL PRINT STYLESHEET
        Enforces exact 80mm x 130mm thermal label paper format, zero margins,
        pure black text on pure white background, and high-density rendering.
      */}
      <style>{`
        @page {
          size: 80mm 130mm;
          margin: 0mm;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
            color: #000000 !important;
            width: 80mm !important;
            height: 130mm !important;
            max-width: 80mm !important;
            max-height: 130mm !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-slip-root, .print-slip-root * {
            visibility: visible !important;
          }

          .print-slip-root {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            height: 130mm !important;
            max-width: 80mm !important;
            max-height: 130mm !important;
            background: #FFFFFF !important;
            color: #000000 !important;
            box-sizing: border-box !important;
            padding: 4.5mm 5mm !important;
            margin: 0 !important;
            border: 2px solid #000000 !important;
            font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
            display: flex !important;
            flex-direction: column !important;
            justifyContent: space-between !important;
            overflow: hidden !important;
            z-index: 999999 !important;
          }

          .screen-only {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 1. ON-SCREEN PREVIEW (Supabase Dark Theme)                                */}
      {/* ========================================================================= */}
      <div className="screen-only">
        <div
          style={{
            backgroundColor: '#1C1C1C',
            color: '#EDEDED',
            width: '320px',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            padding: '20px',
            fontFamily: 'var(--font-sans)',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BusLogo size={22} color="#3ECF8E" />
              <div>
                <div style={{ fontSize: '10px', color: '#3ECF8E', fontWeight: 700, letterSpacing: '0.1em' }}>KSRTC</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#EDEDED', lineHeight: 1 }}>PettiVandi</div>
              </div>
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '9px',
                color: '#A0A0A0',
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '2px 6px',
                borderRadius: '3px',
              }}
            >
              PARCEL WAYBILL
            </div>
          </div>

          {/* Waybill ID Hero */}
          <div
            style={{
              backgroundColor: '#141414',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              padding: '10px 8px',
              marginBottom: '14px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '9px', color: '#A0A0A0', letterSpacing: '0.15em', marginBottom: '3px' }}>
              CONSIGNMENT WAYBILL
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#3ECF8E',
              }}
            >
              {parcel.waybillId}
            </div>
          </div>

          {/* Screen QR Code */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            {screenQr ? (
              <div style={{ backgroundColor: '#FFFFFF', padding: '6px', borderRadius: '6px' }}>
                <img
                  src={screenQr}
                  alt={`QR for ${parcel.waybillId}`}
                  style={{ display: 'block', width: '115px', height: '115px' }}
                />
              </div>
            ) : (
              <div style={{ width: '127px', height: '127px', backgroundColor: '#141414', borderRadius: '6px' }} />
            )}
          </div>

          {/* Route Section */}
          <div
            style={{
              backgroundColor: '#141414',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              padding: '10px 12px',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ fontSize: '9px', color: '#A0A0A0', letterSpacing: '0.08em' }}>TRANSIT CORRIDOR</div>
              <BusTransitIcon size={22} color="#3ECF8E" />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#EDEDED' }}>{parcel.trip.routeName}</div>
            <div className="font-mono" style={{ fontSize: '11px', color: '#E8820C', marginTop: '3px', fontWeight: 500 }}>
              Bus: {parcel.trip.busNumber} · {parcel.trip.distanceKm} km
            </div>
            <div className="font-mono" style={{ fontSize: '10px', color: '#A0A0A0', marginTop: '2px' }}>
              Dep: {deptDate}
            </div>
          </div>

          {/* Details Table */}
          <div style={{ fontSize: '11px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              ['SENDER', parcel.senderName, false],
              ['RECEIVER', parcel.receiverName, false],
              ['WEIGHT', `${parcel.weightKg} kg`, true],
              ['FARE', `₹${parcel.calculatedFare.toFixed(2)}`, true],
            ].map(([label, value, isMono]) => (
              <div
                key={label as string}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span style={{ color: '#A0A0A0', letterSpacing: '0.06em', fontSize: '10px' }}>{label}</span>
                <span
                  className={isMono ? 'font-mono' : ''}
                  style={{
                    fontWeight: 600,
                    color: label === 'FARE' ? '#E8820C' : '#EDEDED',
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '9px', color: '#777777' }}>
            Kerala State Road Transport Corporation · Courier Tag
          </div>
        </div>

        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="no-print"
          style={{
            marginTop: '12px',
            padding: '11px 18px',
            backgroundColor: '#3ECF8E',
            color: '#0A0A0A',
            border: 'none',
            borderRadius: '6px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '320px',
          }}
        >
          <span>🖨</span> Print Official 80mm Slip
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. DEDICATED PRINT SLIP (Strictly 80mm x 130mm, 100% High-Contrast B&W)  */}
      {/* ========================================================================= */}
      <div className="print-slip-root print-only">
        {/* Header with KSRTC Wordmark & Mini Bus Icon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #000000', paddingBottom: '2mm' }}>
          <div>
            <div style={{ fontSize: '8pt', fontWeight: 800, letterSpacing: '0.08em', lineHeight: 1 }}>
              KSRTC PETTIVANDI
            </div>
            <div style={{ fontSize: '6.5pt', fontWeight: 600, letterSpacing: '0.04em', color: '#000000' }}>
              STATE BUS PARCEL SERVICE
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '7pt', fontWeight: 700, border: '1px solid #000000', padding: '1px 3px' }}>
              CONSIGNMENT
            </span>
          </div>
        </div>

        {/* Big High-Contrast Waybill Box */}
        <div
          style={{
            border: '2px solid #000000',
            textAlign: 'center',
            padding: '2mm 1mm',
            backgroundColor: '#FFFFFF',
            margin: '2mm 0',
          }}
        >
          <div style={{ fontSize: '6.5pt', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '1mm' }}>
            WAYBILL NUMBER
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '15pt',
              fontWeight: 900,
              letterSpacing: '0.06em',
              lineHeight: 1,
              color: '#000000',
            }}
          >
            {parcel.waybillId}
          </div>
        </div>

        {/* High-Resolution QR Code (32mm x 32mm scaled from 512px source) */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '1.5mm 0' }}>
          {printQr ? (
            <img
              src={printQr}
              alt={parcel.waybillId}
              style={{
                width: '32mm',
                height: '32mm',
                display: 'block',
                imageRendering: 'pixelated',
              }}
            />
          ) : (
            <div style={{ width: '32mm', height: '32mm', border: '1px solid #000000' }} />
          )}
        </div>

        {/* Route Corridor Box */}
        <div
          style={{
            border: '1.2px solid #000000',
            padding: '2mm 2.5mm',
            backgroundColor: '#FFFFFF',
            margin: '1mm 0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1mm' }}>
            <span style={{ fontSize: '6.5pt', fontWeight: 800, letterSpacing: '0.08em' }}>ROUTE &amp; SCHEDULE</span>
            <span style={{ fontSize: '7pt', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
              {parcel.trip.distanceKm} KM
            </span>
          </div>
          <div style={{ fontSize: '8.5pt', fontWeight: 800, lineHeight: 1.1 }}>
            {parcel.trip.departureDepot}
          </div>
          <div style={{ fontSize: '7pt', fontWeight: 700, margin: '0.5mm 0', color: '#000000' }}>
            ↓ En route bus: {parcel.trip.busNumber}
          </div>
          <div style={{ fontSize: '8.5pt', fontWeight: 800, lineHeight: 1.1 }}>
            {parcel.trip.arrivalDepot}
          </div>
          <div style={{ fontSize: '6.5pt', fontFamily: "'JetBrains Mono', monospace", marginTop: '1mm', color: '#000000' }}>
            DEP: {deptDate}
          </div>
        </div>

        {/* Consignment Details Table */}
        <div style={{ borderTop: '1.2px solid #000000', borderBottom: '1.2px solid #000000', padding: '1mm 0', margin: '1mm 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5mm', fontSize: '7pt' }}>
            <div>
              <span style={{ fontSize: '6pt', fontWeight: 600, color: '#000000', display: 'block' }}>SENDER:</span>
              <strong style={{ fontSize: '7.5pt' }}>{parcel.senderName}</strong>
            </div>
            <div>
              <span style={{ fontSize: '6pt', fontWeight: 600, color: '#000000', display: 'block' }}>RECEIVER:</span>
              <strong style={{ fontSize: '7.5pt' }}>{parcel.receiverName}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5mm', paddingTop: '1mm', borderTop: '0.8px dashed #000000', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '6pt', fontWeight: 600, marginRight: '1mm' }}>WEIGHT:</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '8.5pt' }}>
                {parcel.weightKg} KG
              </span>
            </div>
            <div>
              <span style={{ fontSize: '6pt', fontWeight: 600, marginRight: '1mm' }}>FARE (PAID):</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, fontSize: '10pt' }}>
                ₹{parcel.calculatedFare.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Security / Verification Footer */}
        <div style={{ textAlign: 'center', paddingTop: '1mm' }}>
          <div style={{ fontSize: '5.5pt', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
            PRESENT ID &amp; WAYBILL FOR CLAIM AT DESTINATION DEPOT
          </div>
          <div style={{ fontSize: '5pt', color: '#000000', marginTop: '0.5mm' }}>
            KERALA STATE ROAD TRANSPORT CORPORATION · OFFICIAL CONSIGNMENT TAG
          </div>
        </div>
      </div>
    </div>
  )
}
