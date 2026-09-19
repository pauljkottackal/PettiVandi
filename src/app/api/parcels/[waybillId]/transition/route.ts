import { NextRequest, NextResponse } from 'next/server'
import { ParcelStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { canTransition, getWhatsAppMessage } from '@/lib/stateMachine'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ waybillId: string }> }
) {
  try {
    const { waybillId } = await params
    const body = await request.json()
    const { newStatus, note } = body

    if (!newStatus || !Object.values(ParcelStatus).includes(newStatus as ParcelStatus)) {
      return NextResponse.json(
        { error: 'Invalid or missing newStatus', code: 'INVALID_TRANSITION' },
        { status: 400 }
      )
    }

    const parcel = await prisma.parcel.findUnique({
      where: { waybillId },
      include: { trip: true },
    })

    if (!parcel) {
      return NextResponse.json(
        { error: `No parcel found with waybill ID: ${waybillId}`, code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const result = canTransition(parcel.status, newStatus as ParcelStatus)

    if (!result.allowed) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: 400 }
      )
    }

    // Special rule: BOOKED → LOADED requires a trip to be assigned (it always is at creation, but guard anyway)
    if (newStatus === ParcelStatus.LOADED && !parcel.tripId) {
      return NextResponse.json(
        { error: 'Cannot load parcel: no trip assigned.', code: 'INVALID_TRANSITION' },
        { status: 400 }
      )
    }

    // Update parcel status
    const updatedParcel = await prisma.parcel.update({
      where: { waybillId },
      data: { status: newStatus as ParcelStatus },
      include: { trip: true },
    })

    // Append to status log
    await prisma.statusLog.create({
      data: {
        parcelId: parcel.id,
        status: newStatus as ParcelStatus,
        note: note ?? null,
      },
    })

    // Send WhatsApp notification if opted in
    if (parcel.whatsappOptedIn) {
      const message = getWhatsAppMessage(
        waybillId,
        newStatus as ParcelStatus,
        parcel.trip?.busNumber,
        parcel.trip?.routeName,
        parcel.trip?.arrivalDepot
      )
      // Fire-and-forget — don't block the response on WhatsApp
      sendWhatsAppMessage(parcel.receiverPhone, message).catch((err) =>
        console.error('[WhatsApp] Notification failed:', err)
      )
    }

    return NextResponse.json(updatedParcel)
  } catch (error) {
    console.error('POST /api/parcels/[waybillId]/transition error:', error)
    return NextResponse.json({ error: 'Failed to update parcel status' }, { status: 500 })
  }
}
