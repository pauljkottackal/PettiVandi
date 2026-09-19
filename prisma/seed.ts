import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with KSRTC trips...");

  // Clear existing trips
  await prisma.trip.deleteMany();

  const trips = await Promise.all([
    prisma.trip.create({
      data: {
        routeName: "Angamaly → Kochi (Ernakulam)",
        busNumber: "KL-07-1234",
        departureDepot: "Angamaly Bus Stand",
        arrivalDepot: "Ernakulam (High Court) Bus Stand",
        scheduledDeparture: new Date("2026-09-20T08:00:00+05:30"),
        distanceKm: 25,
      },
    }),
    prisma.trip.create({
      data: {
        routeName: "Kochi → Thrissur",
        busNumber: "KL-07-5678",
        departureDepot: "Ernakulam (High Court) Bus Stand",
        arrivalDepot: "Thrissur KSRTC Bus Stand",
        scheduledDeparture: new Date("2026-09-20T09:30:00+05:30"),
        distanceKm: 75,
      },
    }),
    prisma.trip.create({
      data: {
        routeName: "Kochi → Munnar",
        busNumber: "KL-07-9101",
        departureDepot: "Ernakulam (High Court) Bus Stand",
        arrivalDepot: "Munnar KSRTC Bus Stand",
        scheduledDeparture: new Date("2026-09-20T07:00:00+05:30"),
        distanceKm: 130,
      },
    }),
    prisma.trip.create({
      data: {
        routeName: "Thiruvananthapuram → Kochi",
        busNumber: "KL-01-3344",
        departureDepot: "Thiruvananthapuram Central Bus Stand",
        arrivalDepot: "Ernakulam (High Court) Bus Stand",
        scheduledDeparture: new Date("2026-09-20T06:00:00+05:30"),
        distanceKm: 200,
      },
    }),
  ]);

  console.log(`Created ${trips.length} trips:`);
  trips.forEach((t) =>
    console.log(`  - ${t.routeName} (${t.distanceKm}km) — Bus ${t.busNumber}`),
  );

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
