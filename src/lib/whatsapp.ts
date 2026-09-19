import twilio from "twilio";

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  if (!client) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }
  return client;
}

export async function sendWhatsAppMessage(
  toPhone: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  const twilioClient = getClient();

  if (!twilioClient) {
    console.warn(
      "[WhatsApp] Twilio credentials not configured — skipping message send.",
    );
    return { success: false, error: "Twilio not configured" };
  }

  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!from) {
    return { success: false, error: "TWILIO_WHATSAPP_NUMBER not set" };
  }

  // Normalize phone number — ensure it has WhatsApp prefix
  const to = toPhone.startsWith("whatsapp:")
    ? toPhone
    : `whatsapp:${toPhone.startsWith("+") ? toPhone : "+91" + toPhone}`;

  try {
    const message = await twilioClient.messages.create({
      from,
      to,
      body,
    });
    console.log(`[WhatsApp] Sent to ${to}: ${message.sid}`);
    return { success: true };
  } catch (error) {
    console.error("[WhatsApp] Failed to send message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
