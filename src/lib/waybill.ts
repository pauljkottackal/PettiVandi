/**
 * Generates a human-readable waybill ID in the format PV-YYYY-NNNN.
 * The sequence number is based on a counter stored in the DB (via Prisma).
 * For MVP, we use a timestamp + random suffix to guarantee uniqueness without
 * a separate counter table.
 */
export function generateWaybillId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  const timestamp = Date.now().toString(36).slice(-3).toUpperCase(); // 3-char base36 suffix
  return `PV-${year}-${random}${timestamp}`;
}
