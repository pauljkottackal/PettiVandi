import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const FALLBACK_TRIPS = [
  {
    id: 'cmu8e2k1400014wmbvci70kw7',
    routeName: 'Angamaly → Kochi (Ernakulam)',
    busNumber: 'KL-07-1234',
    departureDepot: 'Angamaly Bus Stand',
    arrivalDepot: 'Ernakulam (High Court) Bus Stand',
    scheduledDeparture: new Date('2026-09-20T08:00:00+05:30'),
    distanceKm: 25,
  },
  {
    id: 'cmu8e2k1500014wmbvci70kw8',
    routeName: 'Kochi → Thrissur',
    busNumber: 'KL-07-5678',
    departureDepot: 'Ernakulam (High Court) Bus Stand',
    arrivalDepot: 'Thrissur KSRTC Bus Stand',
    scheduledDeparture: new Date('2026-09-20T09:30:00+05:30'),
    distanceKm: 75,
  },
  {
    id: 'cmu8e2k1500024wmbhwqghskp',
    routeName: 'Kochi → Munnar',
    busNumber: 'KL-07-9101',
    departureDepot: 'Ernakulam (High Court) Bus Stand',
    arrivalDepot: 'Munnar KSRTC Bus Stand',
    scheduledDeparture: new Date('2026-09-20T07:00:00+05:30'),
    distanceKm: 130,
  },
  {
    id: 'cmu8e2k1600034wmbxzy91234',
    routeName: 'Thiruvananthapuram → Kochi',
    busNumber: 'KL-01-3344',
    departureDepot: 'Thiruvananthapuram Central Bus Stand',
    arrivalDepot: 'Ernakulam (High Court) Bus Stand',
    scheduledDeparture: new Date('2026-09-20T06:00:00+05:30'),
    distanceKm: 200,
  },
]

export async function GET() {
  try {
    const trips = await prisma.trip.findMany({
      orderBy: { scheduledDeparture: 'asc' },
    })
    return NextResponse.json(trips.length > 0 ? trips : FALLBACK_TRIPS)
  } catch (error) {
    console.error('GET /api/trips error, using fallback trips:', error)
    return NextResponse.json(FALLBACK_TRIPS)
  }
}
