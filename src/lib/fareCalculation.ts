/**
 * Fare calculation for PettiVandi parcel service.
 * Formula: baseFee + (weightKg × perKgRate) × distanceBandMultiplier
 *
 * Distance bands:
 *   < 50 km  → multiplier 1.0 (short route)
 *   50-100 km → multiplier 1.3 (medium route)
 *   > 100 km  → multiplier 1.6 (long route)
 */

export const FARE_CONFIG = {
  baseFee: 20, // ₹20 flat base fee
  perKgRate: 15, // ₹15 per kg
  distanceBands: [
    { maxKm: 50, multiplier: 1.0, label: "Short route" },
    { maxKm: 100, multiplier: 1.3, label: "Medium route" },
    { maxKm: Infinity, multiplier: 1.6, label: "Long route" },
  ],
} as const;

export function getDistanceBand(distanceKm: number): {
  multiplier: number;
  label: string;
} {
  const band = FARE_CONFIG.distanceBands.find((b) => distanceKm <= b.maxKm);
  return band ?? { multiplier: 1.6, label: "Long route" };
}

export function calculateFare(weightKg: number, distanceKm: number): number {
  const { multiplier } = getDistanceBand(distanceKm);
  const raw =
    (FARE_CONFIG.baseFee + weightKg * FARE_CONFIG.perKgRate) * multiplier;
  // Round to 2 decimal places
  return Math.round(raw * 100) / 100;
}

export function formatFare(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

/**
 * Returns a breakdown string for display on the waybill slip.
 * e.g. "₹20 base + ₹45 weight (3kg × ₹15) × 1.3 (medium) = ₹84.50"
 */
export function fareBreakdown(weightKg: number, distanceKm: number): string {
  const band = getDistanceBand(distanceKm);
  const weightCharge = weightKg * FARE_CONFIG.perKgRate;
  const total = calculateFare(weightKg, distanceKm);
  return `₹${FARE_CONFIG.baseFee} base + ₹${weightCharge.toFixed(0)} weight (${weightKg}kg × ₹${FARE_CONFIG.perKgRate}) × ${band.multiplier} (${band.label}) = ₹${total.toFixed(2)}`;
}
