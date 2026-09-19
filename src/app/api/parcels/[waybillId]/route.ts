import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ waybillId: string }> }
) {
  try {
    const { waybillId } = await params

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

    return NextResponse.json(parcel)
  } catch (error) {
    console.error('GET /api/parcels/[waybillId] error:', error)
    return NextResponse.json({ error: 'Failed to fetch parcel' }, { status: 500 })
  }
}
