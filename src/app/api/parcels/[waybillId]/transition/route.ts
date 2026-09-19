import { NextRequest, NextResponse } from 'next/server'
import { ParcelStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { canTransition, STATUS_LABELS } from '@/lib/stateMachine'
import { notifyBothParties } from '@/lib/whatsapp'
import {
  formatKSRTCTransitionMessage,
  generateWhatsAppClickToChatUrl,
  getBaseUrlFromRequest,
} from '@/lib/whatsappChat'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ waybillId: string }> }
) {
  try {
    const resolvedParams = await params
    let waybillId = resolvedParams.waybillId || ''
    try {
      waybillId = decodeURIComponent(waybillId)
    } catch {
      // keep raw if decode fails
    }
    waybillId = waybillId.trim()

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

    // Special rule: BOOKED → LOADED requires a trip to be assigned
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

    // Pre-generate WhatsApp click-to-chat links for this status transition
    const baseUrl = getBaseUrlFromRequest(request)
    const transitionMessage = formatKSRTCTransitionMessage({
      waybillId,
      status: newStatus,
      statusLabel: STATUS_LABELS[newStatus as ParcelStatus] ?? newStatus,
      busNumber: parcel.trip?.busNumber,
      routeName: parcel.trip?.routeName,
      arrivalDepot: parcel.trip?.arrivalDepot,
      baseUrl,
    })

    const whatsappLinks = {
      sender: generateWhatsAppClickToChatUrl(parcel.senderPhone, transitionMessage),
      receiver: generateWhatsAppClickToChatUrl(parcel.receiverPhone, transitionMessage),
    }

    let dispatchMode: 'automated' | 'click_to_send' = 'click_to_send'
    let automatedDetails = 'Click-to-chat update link ready'

    try {
      const dispatchPromise = notifyBothParties(parcel.senderPhone, parcel.receiverPhone, transitionMessage)
      let timeoutHandle: NodeJS.Timeout | undefined
      const timeoutPromise = new Promise<null>((resolve) => {
        timeoutHandle = setTimeout(() => resolve(null), 2500)
      })
      const dispatchResult = await Promise.race([dispatchPromise, timeoutPromise])
      if (timeoutHandle) clearTimeout(timeoutHandle)

      if (dispatchResult) {
        if (dispatchResult.receiver.success && dispatchResult.sender.success) {
          dispatchMode = 'automated'
          automatedDetails = 'Twilio status transition delivered to both parties'
        } else if (dispatchResult.receiver.success && !dispatchResult.sender.success) {
          dispatchMode = 'click_to_send'
          automatedDetails = 'Delivered to receiver via Twilio; sender click-to-chat ready'
        } else if (!dispatchResult.receiver.success && dispatchResult.sender.success) {
          dispatchMode = 'click_to_send'
          automatedDetails = 'Delivered to sender via Twilio; receiver click-to-chat ready (Twilio trial)'
        } else {
          dispatchMode = 'click_to_send'
          const isTrial = dispatchResult.receiver.isTrialError || dispatchResult.sender.isTrialError
          automatedDetails = isTrial
            ? 'Twilio trial / sandbox restriction (click-to-chat link available)'
            : (dispatchResult.receiver.error || dispatchResult.sender.error || 'Transition notification fallback')
        }
      } else {
        dispatchMode = 'click_to_send'
        automatedDetails = 'Transition dispatch timed out after 2.5s (click-to-send active)'
      }
    } catch (dispatchErr) {
      console.warn('[WhatsApp] Transition dispatch error caught cleanly:', dispatchErr)
    }

    return NextResponse.json({
      ...updatedParcel,
      senderName: parcel.senderName,
      receiverName: parcel.receiverName,
      whatsappLinks,
      whatsappMessage: transitionMessage,
      whatsappDispatch: {
        mode: dispatchMode,
        details: automatedDetails,
      },
    })
  } catch (error) {
    console.error('POST /api/parcels/[waybillId]/transition error:', error)
    return NextResponse.json({ error: 'Failed to update parcel status' }, { status: 500 })
  }
}
