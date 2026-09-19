import { NextRequest, NextResponse } from 'next/server'
import { ParcelStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { calculateFare } from '@/lib/fareCalculation'
import { generateWaybillId } from '@/lib/waybill'
import { sendWhatsAppMessage, notifyBothParties } from '@/lib/whatsapp'
import { getWhatsAppMessage } from '@/lib/stateMachine'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')

    const where = statusParam && Object.values(ParcelStatus).includes(statusParam as ParcelStatus)
      ? { status: statusParam as ParcelStatus }
      : {}

    const parcels = await prisma.parcel.findMany({
      where,
      include: { trip: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(parcels)
  } catch (error) {
    console.error('GET /api/parcels error:', error)
    return NextResponse.json({ error: 'Failed to fetch parcels' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { senderName, senderPhone, receiverName, receiverPhone, weightKg, description, tripId } = body

    // Validate required fields
    if (!senderName || !senderPhone || !receiverName || !receiverPhone || !weightKg || !tripId) {
      return NextResponse.json(
        { error: 'Missing required fields: senderName, senderPhone, receiverName, receiverPhone, weightKg, tripId' },
        { status: 400 }
      )
    }

    if (typeof weightKg !== 'number' || weightKg <= 0) {
      return NextResponse.json({ error: 'weightKg must be a positive number' }, { status: 400 })
    }

    // Fetch the trip for fare calculation
    const trip = await prisma.trip.findUnique({ where: { id: tripId } })
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    const calculatedFare = calculateFare(weightKg, trip.distanceKm)
    const waybillId = generateWaybillId()

    const parcel = await prisma.parcel.create({
      data: {
        waybillId,
        senderName,
        senderPhone,
        receiverName,
        receiverPhone,
        weightKg,
        description: description ?? '',
        calculatedFare,
        status: ParcelStatus.BOOKED,
        tripId,
        whatsappOptedIn: true, // Auto opt-in on booking for instant demo delivery
      },
      include: { trip: true },
    })

    // Write initial status log
    await prisma.statusLog.create({
      data: {
        parcelId: parcel.id,
        status: ParcelStatus.BOOKED,
        note: 'Parcel booked at depot counter',
      },
    })

    // Send instant WhatsApp booking confirmation to BOTH sender and receiver by default
    const bookingMsg = getWhatsAppMessage(
      parcel.waybillId,
      ParcelStatus.BOOKED,
      trip.busNumber,
      trip.routeName,
      trip.arrivalDepot
    )
    notifyBothParties(senderPhone, receiverPhone, bookingMsg).then((res) => {
      console.log(`[WhatsApp] Booking dispatched to both parties:`, res)
    }).catch((err) => {
      console.error(`[WhatsApp] Booking dispatch error:`, err)
    })

    return NextResponse.json(parcel, { status: 201 })
  } catch (error) {
    console.error('POST /api/parcels error:', error)
    return NextResponse.json({ error: 'Failed to create parcel' }, { status: 500 })
  }
}
