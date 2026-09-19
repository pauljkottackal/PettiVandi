import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PettiVandi — KSRTC Parcel Booking',
  description: 'Digital parcel booking and tracking for KSRTC state buses',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans" style={{ backgroundColor: 'var(--color-bg)' }}>
        {children}
      </body>
    </html>
  )
}
