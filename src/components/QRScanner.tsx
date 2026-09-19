'use client'

import { useEffect, useRef, useState } from 'react'

interface QRScannerProps {
  onScan: (waybillId: string) => void
  onError?: (error: string) => void
  active?: boolean
}

export default function QRScanner({ onScan, onError, active = true }: QRScannerProps) {
  const scannerRef = useRef<unknown>(null)
  const elementId = 'qr-reader-element'
  const [status, setStatus] = useState<'loading' | 'scanning' | 'error'>('loading')

  useEffect(() => {
    if (!active) return

    let mounted = true

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!mounted) return

        const scanner = new Html5Qrcode(elementId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            onScan(decodedText.trim())
          },
          undefined
        )
        if (mounted) setStatus('scanning')
      } catch (err) {
        if (mounted) {
          setStatus('error')
          onError?.(err instanceof Error ? err.message : 'Camera access denied')
        }
      }
    }

    startScanner()

    return () => {
      mounted = false
      if (scannerRef.current) {
        const scanner = scannerRef.current as { stop: () => Promise<void>; clear: () => void }
        scanner.stop().then(() => scanner.clear()).catch(() => {})
        scannerRef.current = null
      }
    }
  }, [active, onScan, onError])

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', backgroundColor: '#111', color: '#7A8694',
          fontSize: '14px', zIndex: 1,
        }}>
          Initialising camera…
        </div>
      )}
      {status === 'error' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a0000',
          color: '#ff6b6b', fontSize: '14px', gap: '8px', padding: '24px', textAlign: 'center', zIndex: 1,
        }}>
          <span style={{ fontSize: '32px' }}>📷</span>
          <span>Camera access denied or unavailable.</span>
          <span style={{ fontSize: '12px', color: '#7A8694' }}>Allow camera permission and reload this page.</span>
        </div>
      )}
      <div
        id={elementId}
        style={{ width: '100%', minHeight: '300px', backgroundColor: '#000' }}
      />
    </div>
  )
}
