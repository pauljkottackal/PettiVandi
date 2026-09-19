/**
 * WhatsApp Click-to-Chat & KSRTC Notification Message Generator
 * Generates standard https://wa.me/<normalized_phone>?text=<url_encoded_message> links
 * for direct click-to-send fallback and sharing.
 */

/**
 * Normalizes phone numbers to standard E.164 digits without '+', spaces, dashes, or leading zeroes.
 * Specifically handles Indian mobile formats:
 * - 10-digit domestic (e.g. 8281209675) -> 918281209675
 * - Domestic with 0 prefix (e.g. 08281209675) -> 918281209675
 * - International with +91 (e.g. +91 82812 09675) -> 918281209675
 * - International with trunk 0 (e.g. +91 08281209675) -> 918281209675
 * - Strips whatsapp: prefix if present
 * - Filters out invalid / non-numeric values safely
 */
export function normalizePhoneForWaMe(rawPhone?: string | null): string {
  if (!rawPhone) return ''
  let cleaned = String(rawPhone).trim()

  // Strip 'whatsapp:' prefix if present
  if (cleaned.toLowerCase().startsWith('whatsapp:')) {
    cleaned = cleaned.substring(9).trim()
  }

  // Remove leading plus '+'
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  // Remove all non-digit characters
  cleaned = cleaned.replace(/\D/g, '')
  if (!cleaned) return ''

  // If international dialing prefix 00 exists (e.g. 00918281209675)
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.replace(/^00+/, '')
  }

  // If starts with 91 followed by one or more trunk zeroes and 10 digits (e.g. 9108281209675 or 91008281209675 -> 918281209675)
  if (/^910+\d{10}$/.test(cleaned)) {
    cleaned = `91${cleaned.substring(2).replace(/^0+/, '')}`
  }

  // Remove leading zeroes (e.g. 08281209675 -> 8281209675)
  cleaned = cleaned.replace(/^0+/, '')

  // If 10 digits, assume standard Indian mobile and prepend country code 91
  if (/^\d{10}$/.test(cleaned)) {
    cleaned = `91${cleaned}`
  }

  // Plausibility check: minimum 7 digits for any phone number
  if (cleaned.length < 7) {
    return ''
  }

  return cleaned
}

/**
 * Resolves the application base URL for live tracking links
 */
export function resolveBaseUrl(baseUrl?: string): string {
  if (baseUrl && baseUrl.trim()) {
    return baseUrl.trim().replace(/\/+$/, '')
  }
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.origin &&
    window.location.origin !== 'null'
  ) {
    return window.location.origin.replace(/\/+$/, '')
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, '')
  }
  return 'http://localhost:3000'
}

/**
 * Extracts the accurate application base URL from an incoming Next.js request.
 * Checks NEXT_PUBLIC_APP_URL, Origin, x-forwarded-host, host, and request.nextUrl.
 * Safely handles multi-tier proxy lists (comma-separated).
 */
export function getBaseUrlFromRequest(request: {
  headers: { get(name: string): string | null }
  nextUrl?: { origin: string }
}): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, '')
  }
  const origin = request.headers.get('origin')
  if (origin && origin !== 'null') {
    return origin.trim().replace(/\/+$/, '')
  }
  const rawForwardedHost = request.headers.get('x-forwarded-host')
  if (rawForwardedHost) {
    const forwardedHost = rawForwardedHost.split(',')[0].trim()
    const rawProto = request.headers.get('x-forwarded-proto') || 'https'
    const forwardedProto = rawProto.split(',')[0].trim()
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '')
  }
  if (request.nextUrl?.origin) {
    return request.nextUrl.origin.replace(/\/+$/, '')
  }
  const rawHost = request.headers.get('host')
  if (rawHost) {
    const host = rawHost.split(',')[0].trim()
    const proto = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https'
    return `${proto}://${host}`.replace(/\/+$/, '')
  }
  return 'http://localhost:3000'
}

/**
 * Returns the live tracking URL for a given waybill ID (/track/<waybillId>)
 */
export function getLiveTrackingUrl(waybillId: string, baseUrl?: string): string {
  const base = resolveBaseUrl(baseUrl)
  return `${base}/track/${encodeURIComponent((waybillId || '').trim())}`
}

export interface KSRTCReceiptData {
  waybillId: string
  origin: string
  destination: string
  busNumber: string
  weightKg: number
  fare: number
  baseUrl?: string
}

/**
 * Formats the official KSRTC PettiVandi consignment receipt message.
 * Must include: Waybill ID, Origin, Destination, Bus Number, Weight, Fare,
 * and the live tracking URL (/track/<waybillId>).
 */
export function formatKSRTCReceiptMessage(data: KSRTCReceiptData): string {
  const trackingUrl = getLiveTrackingUrl(data.waybillId, data.baseUrl)
  const fareFormatted = Number(data.fare || 0).toFixed(2)
  const weightFormatted = Number(data.weightKg || 0).toString()

  return (
    `📦 *KSRTC PettiVandi Official Consignment Receipt*\n\n` +
    `*Waybill ID:* ${data.waybillId}\n` +
    `*Origin Depot:* ${data.origin || 'Depot Counter'}\n` +
    `*Destination Depot:* ${data.destination || 'Arrival Depot'}\n` +
    `*Assigned Bus:* ${data.busNumber || 'Scheduled Service'}\n` +
    `*Consignment Weight:* ${weightFormatted} kg\n` +
    `*Stage Fare:* ₹${fareFormatted}\n\n` +
    `📍 *Track Live Custody & Bus Progress:*\n` +
    `${trackingUrl}\n\n` +
    `_Kerala State Road Transport Corporation — Express Courier Network_`
  )
}

/**
 * Formats status transition notification messages for conductors / depots
 */
export function formatKSRTCTransitionMessage(params: {
  waybillId: string
  status: string
  statusLabel?: string
  busNumber?: string
  routeName?: string
  arrivalDepot?: string
  baseUrl?: string
}): string {
  const trackingUrl = getLiveTrackingUrl(params.waybillId, params.baseUrl)
  const bus = params.busNumber ?? 'KSRTC Bus'
  const route = params.routeName ? ` (${params.routeName})` : ''
  const destination = params.arrivalDepot ?? 'Destination Depot'

  let statusText = `Status updated to *${params.statusLabel ?? params.status}*`
  switch (params.status) {
    case 'LOADED':
      statusText = `Loaded into luggage hold of bus *${bus}*${route}`
      break
    case 'IN_TRANSIT':
      statusText = `In transit on bus *${bus}*${route}. Heading to *${destination}*`
      break
    case 'UNLOADED':
      statusText = `Arrived & unloaded at *${destination}*. Ready for collection at depot counter`
      break
    case 'CLAIMED':
      statusText = `Consignment collected by receiver. Custody complete`
      break
    default:
      if (params.statusLabel) statusText = `Status: *${params.statusLabel}*`
  }

  return (
    `🚌 *KSRTC PettiVandi Custody Update*\n\n` +
    `*Waybill ID:* ${params.waybillId}\n` +
    `*Current Status:* ${statusText}\n` +
    `*Bus:* ${bus}\n` +
    `*Destination:* ${destination}\n\n` +
    `📍 *Track Live:* ${trackingUrl}`
  )
}

/**
 * Generates a standard https://wa.me/<normalized_phone>?text=<url_encoded_message> URL.
 * If phone is omitted or empty, generates https://wa.me/?text=... for general sharing.
 */
export function generateWhatsAppClickToChatUrl(
  phone?: string | null,
  message: string = ''
): string {
  const normalizedPhone = normalizePhoneForWaMe(phone)
  const encodedMessage = encodeURIComponent(message)

  if (!normalizedPhone) {
    return `https://wa.me/?text=${encodedMessage}`
  }

  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`
}

export interface BookingWhatsAppLinksInput {
  waybillId: string
  senderPhone?: string | null
  receiverPhone?: string | null
  weightKg: number
  calculatedFare?: number
  fare?: number
  trip?: {
    departureDepot?: string
    arrivalDepot?: string
    busNumber?: string
    routeName?: string
  } | null
  origin?: string
  destination?: string
  busNumber?: string
  baseUrl?: string
}

export interface BookingWhatsAppLinksOutput {
  sender: string
  receiver: string
  shareable: string
  message: string
  trackingUrl: string
  normalizedSenderPhone: string
  normalizedReceiverPhone: string
}

/**
 * Generates click-to-chat links for both sender and receiver, plus the raw message and tracking URL.
 */
export function generateBookingWhatsAppLinks(
  input: BookingWhatsAppLinksInput,
  baseUrl?: string
): BookingWhatsAppLinksOutput {
  const origin = input.trip?.departureDepot || input.origin || 'Depot Counter'
  const destination = input.trip?.arrivalDepot || input.destination || 'Arrival Depot'
  const busNumber = input.trip?.busNumber || input.busNumber || 'Scheduled Bus'
  const fare = input.calculatedFare ?? input.fare ?? 0
  const weightKg = typeof input.weightKg === 'number' ? input.weightKg : Number(input.weightKg || 0)

  const message = formatKSRTCReceiptMessage({
    waybillId: input.waybillId,
    origin,
    destination,
    busNumber,
    weightKg,
    fare,
    baseUrl: input.baseUrl || baseUrl,
  })

  const trackingUrl = getLiveTrackingUrl(input.waybillId, input.baseUrl || baseUrl)
  const normalizedSenderPhone = normalizePhoneForWaMe(input.senderPhone)
  const normalizedReceiverPhone = normalizePhoneForWaMe(input.receiverPhone)

  return {
    sender: generateWhatsAppClickToChatUrl(input.senderPhone, message),
    receiver: generateWhatsAppClickToChatUrl(input.receiverPhone, message),
    shareable: generateWhatsAppClickToChatUrl(null, message),
    message,
    trackingUrl,
    normalizedSenderPhone,
    normalizedReceiverPhone,
  }
}
