import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const trips = await prisma.trip.findMany({
      orderBy: { scheduledDeparture: 'asc' },
    })
    return NextResponse.json(trips)
  } catch (error) {
    console.error('GET /api/trips error:', error)
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 })
  }
}
