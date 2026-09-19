import { NextRequest, NextResponse } from 'next/server'
import { ParcelStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { calculateFare } from '@/lib/fareCalculation'
import { generateWaybillId } from '@/lib/waybill'
import { notifyBothParties } from '@/lib/whatsapp'
import { generateBookingWhatsAppLinks, getBaseUrlFromRequest } from '@/lib/whatsappChat'

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

    const baseUrl = getBaseUrlFromRequest(request)
    const augmentedParcels = parcels.map((p) => {
      const links = generateBookingWhatsAppLinks(p, baseUrl)
      return {
        ...p,
        whatsappLinks: {
          sender: links.sender,
          receiver: links.receiver,
        },
        whatsappMessage: links.message,
      }
    })

    return NextResponse.json(augmentedParcels)
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

    // Generate reliable WhatsApp click-to-chat links for both parties
    const baseUrl = getBaseUrlFromRequest(request)
    const linksData = generateBookingWhatsAppLinks(
      {
        waybillId: parcel.waybillId,
        senderPhone: parcel.senderPhone,
        receiverPhone: parcel.receiverPhone,
        weightKg: parcel.weightKg,
        calculatedFare: parcel.calculatedFare,
        trip: {
          departureDepot: trip.departureDepot,
          arrivalDepot: trip.arrivalDepot,
          busNumber: trip.busNumber,
          routeName: trip.routeName,
        },
      },
      baseUrl
    )

    // Attempt Twilio automated delivery if possible, catching trial errors cleanly
    let dispatchMode: 'automated' | 'click_to_send' = 'click_to_send'
    let automatedDetails = 'Click-to-chat fallback link ready'

    try {
      const dispatchPromise = notifyBothParties(senderPhone, receiverPhone, linksData.message)
      let timeoutHandle: NodeJS.Timeout | undefined
      const timeoutPromise = new Promise<null>((resolve) => {
        timeoutHandle = setTimeout(() => resolve(null), 2500)
      })
      const dispatchResult = await Promise.race([dispatchPromise, timeoutPromise])
      if (timeoutHandle) clearTimeout(timeoutHandle)

      if (dispatchResult) {
        if (dispatchResult.receiver.success && dispatchResult.sender.success) {
          dispatchMode = 'automated'
          automatedDetails = 'Twilio automated message dispatched to both parties'
        } else if (dispatchResult.receiver.success && !dispatchResult.sender.success) {
          dispatchMode = 'click_to_send'
          automatedDetails = 'Automated message delivered to receiver; sender click-to-chat ready'
        } else if (!dispatchResult.receiver.success && dispatchResult.sender.success) {
          dispatchMode = 'click_to_send'
          automatedDetails = 'Automated message delivered to sender; receiver click-to-chat ready (Twilio trial)'
        } else {
          dispatchMode = 'click_to_send'
          const isTrial = dispatchResult.receiver.isTrialError || dispatchResult.sender.isTrialError
          automatedDetails = isTrial
            ? 'Twilio trial / sandbox restriction (click-to-send active)'
            : (dispatchResult.receiver.error || dispatchResult.sender.error || 'Automated dispatch bypassed')
        }
      } else {
        dispatchMode = 'click_to_send'
        automatedDetails = 'Twilio automated dispatch timed out after 2.5s (click-to-send active)'
      }
    } catch (dispatchErr) {
      console.warn('[WhatsApp] Automated dispatch handled gracefully:', dispatchErr)
    }

    return NextResponse.json(
      {
        ...parcel,
        whatsappLinks: {
          sender: linksData.sender,
          receiver: linksData.receiver,
        },
        whatsappMessage: linksData.message,
        whatsappDispatch: {
          mode: dispatchMode,
          details: automatedDetails,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/parcels error:', error)
    return NextResponse.json({ error: 'Failed to create parcel' }, { status: 500 })
  }
}
