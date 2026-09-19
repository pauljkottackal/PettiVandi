'use client'

import { useState, useEffect } from 'react'
import { generateBookingWhatsAppLinks, normalizePhoneForWaMe } from '@/lib/whatsappChat'

export interface WhatsAppDispatchParcel {
  id?: string
  waybillId: string
  senderName: string
  senderPhone: string
  receiverName: string
  receiverPhone: string
  weightKg: number
  calculatedFare?: number
  fare?: number
  status: string
  trip?: {
    departureDepot: string
    arrivalDepot: string
    busNumber: string
    routeName?: string
  }
  whatsappLinks?: {
    sender: string
    receiver: string
  }
  whatsappMessage?: string
  whatsappDispatch?: {
    mode: 'automated' | 'click_to_send'
    details?: string
  }
}

interface WhatsAppDispatchPanelProps {
  parcel: WhatsAppDispatchParcel
  onClose?: () => void
  isModal?: boolean
}

export default function WhatsAppDispatchPanel({
  parcel,
  onClose,
  isModal = false,
}: WhatsAppDispatchPanelProps) {
  const [copied, setCopied] = useState(false)

  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isModal || !onClose) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModal, onClose])

  // Ensure click-to-chat links and formatted message are available
  const linksData = generateBookingWhatsAppLinks({
    waybillId: parcel.waybillId,
    senderPhone: parcel.senderPhone,
    receiverPhone: parcel.receiverPhone,
    weightKg: parcel.weightKg,
    calculatedFare: parcel.calculatedFare ?? parcel.fare,
    trip: parcel.trip,
  })

  // Prefer fresh client-generated links to guarantee active browser host/port alignment
  const senderLink = typeof window !== 'undefined' && linksData.sender ? linksData.sender : (parcel.whatsappLinks?.sender || linksData.sender)
  const receiverLink = typeof window !== 'undefined' && linksData.receiver ? linksData.receiver : (parcel.whatsappLinks?.receiver || linksData.receiver)
  const displayMessage = typeof window !== 'undefined' && linksData.message ? linksData.message : (parcel.whatsappMessage || linksData.message)
  const dispatchMode = parcel.whatsappDispatch?.mode || 'click_to_send'
  const dispatchDetails = parcel.whatsappDispatch?.details

  const senderNormalized = normalizePhoneForWaMe(parcel.senderPhone)
  const receiverNormalized = normalizePhoneForWaMe(parcel.receiverPhone)

  const handleCopyMessage = async () => {
    let success = false
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(displayMessage)
        success = true
      } catch {
        success = false
      }
    }
    if (!success && typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea')
        textArea.value = displayMessage
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        success = document.execCommand('copy')
        document.body.removeChild(textArea)
      } catch {
        success = false
      }
    }
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        color: '#EDEDED',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Header with Title & Dismiss Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>💬</span>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#EDEDED' }}>
              WhatsApp Notification &amp; Dispatch
            </h3>
          </div>
          <div className="font-mono" style={{ fontSize: '11px', color: '#3ECF8E', marginTop: '2px' }}>
            Consignment: {parcel.waybillId}
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              color: '#A0A0A0',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '4px 8px',
            }}
          >
            ✕ Close
          </button>
        )}
      </div>

      {/* Fallback Status Indicator: Automated vs Click-to-Send */}
      <div
        style={{
          backgroundColor: dispatchMode === 'automated' ? 'rgba(62, 207, 142, 0.08)' : 'rgba(232, 130, 12, 0.1)',
          border: `1px solid ${dispatchMode === 'automated' ? 'rgba(62, 207, 142, 0.25)' : 'rgba(232, 130, 12, 0.3)'}`,
          borderRadius: '6px',
          padding: '12px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: dispatchMode === 'automated' ? '#3ECF8E' : '#E8820C',
              display: 'inline-block',
            }}
          />
          <span
            className="font-mono"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: dispatchMode === 'automated' ? '#3ECF8E' : '#E8820C',
              textTransform: 'uppercase',
            }}
          >
            {dispatchMode === 'automated' ? 'Automated Dispatch Active' : 'Click-to-Send Mode Active (Direct wa.me)'}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#A0A0A0', lineHeight: 1.4 }}>
          {dispatchMode === 'automated'
            ? 'Official KSRTC receipt notification dispatched through automated Twilio delivery.'
            : dispatchDetails ||
              'Twilio trial / sandbox account active. 1-click fallback buttons generate instant WhatsApp messages directly with customer chats without restrictions.'}
        </div>
      </div>

      {/* 1-Click WhatsApp Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '10px', color: '#A0A0A0', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Direct 1-Click WhatsApp Delivery:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {/* Sender Button */}
          <a
            href={senderLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '12px 14px',
              backgroundColor: '#25D366',
              color: '#0A0A0A',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '13px',
              transition: 'opacity 0.15s ease',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💬</span>
              <span>Open WhatsApp (Sender)</span>
              <span style={{ fontSize: '11px', marginLeft: 'auto' }}>↗</span>
            </div>
            <div className="font-mono" style={{ fontSize: '10px', opacity: 0.9, fontWeight: 500 }}>
              {parcel.senderName} {senderNormalized ? `(+${senderNormalized})` : (parcel.senderPhone ? `(${parcel.senderPhone})` : '(No phone)')}
            </div>
          </a>

          {/* Receiver Button */}
          <a
            href={receiverLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '12px 14px',
              backgroundColor: '#1EBE5D',
              color: '#0A0A0A',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '13px',
              transition: 'opacity 0.15s ease',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💬</span>
              <span>Open WhatsApp (Receiver)</span>
              <span style={{ fontSize: '11px', marginLeft: 'auto' }}>↗</span>
            </div>
            <div className="font-mono" style={{ fontSize: '10px', opacity: 0.9, fontWeight: 500 }}>
              {parcel.receiverName} {receiverNormalized ? `(+${receiverNormalized})` : (parcel.receiverPhone ? `(${parcel.receiverPhone})` : '(No phone)')}
            </div>
          </a>
        </div>
      </div>

      {/* WhatsApp Message Preview Bubble */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}
        >
          <span style={{ fontSize: '10px', color: '#A0A0A0', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Formatted Notification Preview:
          </span>
          <button
            onClick={handleCopyMessage}
            style={{
              background: 'none',
              border: 'none',
              color: copied ? '#3ECF8E' : '#A0A0A0',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy Text'}
          </button>
        </div>

        <div
          style={{
            backgroundColor: '#0F1E17',
            border: '1px solid rgba(37, 211, 102, 0.25)',
            borderLeft: '3px solid #25D366',
            borderRadius: '6px',
            padding: '14px',
            fontSize: '12px',
            lineHeight: 1.5,
            color: '#EDEDED',
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-mono)',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {displayMessage}
        </div>
      </div>

      {/* Quick Tracking URL Action */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: '11px',
        }}
      >
        <span style={{ color: '#A0A0A0' }}>Direct Citizen Tracking URL:</span>
        <a
          href={linksData.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono"
          style={{ color: '#3ECF8E', textDecoration: 'none' }}
        >
          {`/track/${parcel.waybillId}`} ↗
        </a>
      </div>
    </div>
  )

  if (isModal) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose()
        }}
      >
        <div
          style={{
            backgroundColor: '#1C1C1C',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            maxWidth: '560px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
          }}
        >
          {content}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: '#1C1C1C',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '20px',
      }}
    >
      {content}
    </div>
  )
}
