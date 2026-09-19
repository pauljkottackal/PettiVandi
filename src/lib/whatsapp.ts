import twilio from 'twilio'
import { normalizePhoneForWaMe } from './whatsappChat'
export * from './whatsappChat'

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

export function normalizeWhatsAppNumber(rawPhone?: string | null): string {
  if (!rawPhone) return ''
  const digits = normalizePhoneForWaMe(rawPhone)
  if (!digits) return ''
  return `whatsapp:+${digits}`
}

export interface SendWhatsAppResult {
  success: boolean
  sid?: string
  error?: string
  code?: number | string
  isTrialError?: boolean
}

export async function sendWhatsAppMessage(
  toPhone: string,
  body: string
): Promise<SendWhatsAppResult> {
  const twilioClient = getClient()

  if (!twilioClient) {
    console.warn('[WhatsApp] Twilio credentials not configured in environment.')
    return { success: false, error: 'Twilio not configured', isTrialError: true }
  }

  const from = process.env.TWILIO_WHATSAPP_NUMBER
  if (!from) {
    console.warn('[WhatsApp] TWILIO_WHATSAPP_NUMBER not set.')
    return { success: false, error: 'TWILIO_WHATSAPP_NUMBER not set', isTrialError: true }
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
  } catch (error: unknown) {
    const err = error as { message?: string; code?: number | string; status?: number }
    const errMsg = err?.message ?? String(error)
    const errCode = err?.code ? `(Twilio Code: ${err.code})` : ''
    const isTrialError =
      err?.code === 21654 ||
      err?.code === '21654' ||
      err?.code === 21608 ||
      err?.code === '21608' ||
      err?.code === 63016 ||
      err?.code === '63016' ||
      err?.code === 63015 ||
      err?.code === '63015' ||
      err?.code === 63007 ||
      err?.code === '63007' ||
      err?.code === 572002 ||
      err?.code === '572002' ||
      errMsg.toLowerCase().includes('sandbox') ||
      errMsg.toLowerCase().includes('trial') ||
      errMsg.toLowerCase().includes('unverified') ||
      errMsg.toLowerCase().includes('verified recipient') ||
      errMsg.toLowerCase().includes('contentsid') ||
      errMsg.toLowerCase().includes('content sid') ||
      errMsg.toLowerCase().includes('template')

    console.warn(`[WhatsApp] Delivery attempt to ${to} bypassed/failed: ${errMsg} ${errCode}`)
    return {
      success: false,
      error: `${errMsg} ${errCode}`.trim(),
      code: err?.code,
      isTrialError,
    }
  }
}

/**
 * Dispatch message to both sender and receiver concurrently by default
 */
export async function notifyBothParties(
  senderPhone?: string | null,
  receiverPhone?: string | null,
  message: string = ''
): Promise<{
  receiver: SendWhatsAppResult
  sender: SendWhatsAppResult
  mode: 'automated' | 'click_to_send'
}> {
  const normReceiver = normalizeWhatsAppNumber(receiverPhone)
  const normSender = normalizeWhatsAppNumber(senderPhone)

  // If both phone numbers normalize to the same destination
  if (normReceiver && normSender && normReceiver === normSender) {
    const singleResult = await sendWhatsAppMessage(receiverPhone!, message)
    return {
      receiver: singleResult,
      sender: singleResult,
      mode: singleResult.success ? 'automated' : 'click_to_send',
    }
  }

  const tasks: [Promise<SendWhatsAppResult>, Promise<SendWhatsAppResult>] = [
    normReceiver
      ? sendWhatsAppMessage(receiverPhone!, message)
      : Promise.resolve({ success: false, error: 'No receiver phone' }),
    normSender
      ? sendWhatsAppMessage(senderPhone!, message)
      : Promise.resolve({ success: false, error: 'No sender phone' }),
  ]

  const [receiverRes, senderRes] = await Promise.all(tasks)
  const mode = (receiverRes.success && senderRes.success) ? 'automated' : 'click_to_send'

  return { receiver: receiverRes, sender: senderRes, mode }
}
