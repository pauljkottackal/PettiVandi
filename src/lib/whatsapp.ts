import twilio from 'twilio'

let client: ReturnType<typeof twilio> | null = null

function getClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null
  }
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  }
  return client
}

export function normalizeWhatsAppNumber(rawPhone: string): string {
  // Strip whitespace, hyphens, brackets
  let cleaned = rawPhone.trim().replace(/[\s\-()]/g, '')
  if (!cleaned) return ''

  // If starts with whatsapp: strip it first for clean normalization
  if (cleaned.startsWith('whatsapp:')) {
    cleaned = cleaned.replace('whatsapp:', '')
  }

  // Ensure leading +
  if (!cleaned.startsWith('+')) {
    // If leading 0 (domestic format), remove it
    cleaned = cleaned.replace(/^0+/, '')
    cleaned = `+91${cleaned}`
  }

  return `whatsapp:${cleaned}`
}

export async function sendWhatsAppMessage(
  toPhone: string,
  body: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const twilioClient = getClient()

  if (!twilioClient) {
    console.warn('[WhatsApp] Twilio credentials not configured in environment.')
    return { success: false, error: 'Twilio not configured' }
  }

  const from = process.env.TWILIO_WHATSAPP_NUMBER
  if (!from) {
    console.warn('[WhatsApp] TWILIO_WHATSAPP_NUMBER not set.')
    return { success: false, error: 'TWILIO_WHATSAPP_NUMBER not set' }
  }

  const to = normalizeWhatsAppNumber(toPhone)
  if (!to) {
    return { success: false, error: 'Invalid phone number' }
  }

  try {
    const message = await twilioClient.messages.create({
      from,
      to,
      body,
    })
    console.log(`[WhatsApp] Successfully delivered to ${to} (SID: ${message.sid})`)
    return { success: true, sid: message.sid }
  } catch (error: any) {
    const errMsg = error?.message ?? String(error)
    const errCode = error?.code ? `(Twilio Code: ${error.code})` : ''
    console.error(`[WhatsApp] Failed to dispatch to ${to}: ${errMsg} ${errCode}`)
    return {
      success: false,
      error: `${errMsg} ${errCode}`,
    }
  }
}

/**
 * Dispatch message to both sender and receiver concurrently by default
 */
export async function notifyBothParties(
  senderPhone: string,
  receiverPhone: string,
  message: string
): Promise<{ sender: { success: boolean }; receiver: { success: boolean } }> {
  const tasks: Promise<{ success: boolean }>[] = []

  // Receiver notification
  if (receiverPhone) {
    tasks.push(sendWhatsAppMessage(receiverPhone, message))
  } else {
    tasks.push(Promise.resolve({ success: false }))
  }

  // Sender notification (if different number)
  const normSender = normalizeWhatsAppNumber(senderPhone)
  const normReceiver = normalizeWhatsAppNumber(receiverPhone)

  if (senderPhone && normSender !== normReceiver) {
    tasks.push(sendWhatsAppMessage(senderPhone, message))
  } else {
    // Same number or no sender phone, receiver already covered
    tasks.push(Promise.resolve({ success: true }))
  }

  const [receiverRes, senderRes] = await Promise.all(tasks)
  return { receiver: receiverRes, sender: senderRes }
}
