import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ waybillId: string }> }
) {
  try {
    const { waybillId } = await params

    const parcel = await prisma.parcel.findUnique({ where: { waybillId } })

    if (!parcel) {
      return NextResponse.json(
        { error: `No parcel found with waybill ID: ${waybillId}` },
        { status: 404 }
      )
    }

    if (parcel.whatsappOptedIn) {
      return NextResponse.json({ message: 'Already opted in', whatsappOptedIn: true })
    }

    const updated = await prisma.parcel.update({
      where: { waybillId },
      data: { whatsappOptedIn: true },
    })

    return NextResponse.json({ message: 'WhatsApp opt-in confirmed', whatsappOptedIn: updated.whatsappOptedIn })
  } catch (error) {
    console.error('POST /api/parcels/[waybillId]/whatsapp-optin error:', error)
    return NextResponse.json({ error: 'Failed to update opt-in status' }, { status: 500 })
  }
}
