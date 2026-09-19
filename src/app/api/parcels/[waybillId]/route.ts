import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateBookingWhatsAppLinks, getBaseUrlFromRequest } from '@/lib/whatsappChat'

export async function GET(
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

    const parcel = await prisma.parcel.findUnique({
      where: { waybillId },
      include: {
        trip: true,
        statusLogs: {
          orderBy: { timestamp: 'asc' },
        },
      },
    })

    if (!parcel) {
      return NextResponse.json(
        { error: 'No parcel found with that waybill ID — check the number and try again.' },
        { status: 404 }
      )
    }

    const baseUrl = getBaseUrlFromRequest(request)
    const linksData = generateBookingWhatsAppLinks(parcel, baseUrl)

    return NextResponse.json({
      ...parcel,
      whatsappLinks: {
        sender: linksData.sender,
        receiver: linksData.receiver,
      },
      whatsappMessage: linksData.message,
    })
  } catch (error) {
    console.error('GET /api/parcels/[waybillId] error:', error)
    return NextResponse.json({ error: 'Failed to fetch parcel' }, { status: 500 })
  }
}
