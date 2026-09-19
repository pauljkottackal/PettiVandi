import React from 'react'

/**
 * Functional KSRTC Bus Line-Art SVG Icons
 * Used across the Header wordmark, Route Timeline, and Waybill Slip.
 */

export function BusLogo({ size = 22, color = '#3ECF8E' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Bus front/side compact silhouette */}
      <rect x="3" y="3" width="18" height="15" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 3v6" />
      <path d="M15 3v6" />
      <circle cx="7.5" cy="15.5" r="1.5" />
      <circle cx="16.5" cy="15.5" r="1.5" />
      <path d="M5 18v2" />
      <path d="M19 18v2" />
    </svg>
  )
}

export function BusTransitIcon({
  size = 32,
  color = '#3ECF8E',
  className = '',
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.65)}
      viewBox="0 0 44 28"
      fill="none"
      className={className}
    >
      {/* Sleek State Bus Side Profile */}
      <rect x="2" y="3" width="38" height="18" rx="3" fill="#1C1C1C" stroke={color} strokeWidth="1.8" />
      {/* Front Windshield */}
      <path d="M32 5h6.5c.8 0 1.5.6 1.5 1.5V11H32V5z" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="1.2" />
      {/* Passenger Windows */}
      <rect x="6" y="6" width="6" height="5" rx="1" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1" />
      <rect x="15" y="6" width="6" height="5" rx="1" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1" />
      <rect x="23" y="6" width="6" height="5" rx="1" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1" />
      {/* Luggage hold compartment seam */}
      <line x1="5" y1="17" x2="35" y2="17" stroke={color} strokeWidth="1" strokeDasharray="3 2" />
      {/* Headlight */}
      <rect x="38.5" y="14" width="2" height="2" rx="0.5" fill="#E8820C" />
      {/* Wheels */}
      <circle cx="11" cy="22" r="3.5" fill="#0A0A0A" stroke={color} strokeWidth="1.6" />
      <circle cx="11" cy="22" r="1" fill={color} />
      <circle cx="31" cy="22" r="3.5" fill="#0A0A0A" stroke={color} strokeWidth="1.6" />
      <circle cx="31" cy="22" r="1" fill={color} />
    </svg>
  )
}

export function DepotIcon({ size = 28, color = '#A0A0A0' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Station / Depot terminal building */}
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
      <path d="M10 21v-3h4v3" />
    </svg>
  )
}
