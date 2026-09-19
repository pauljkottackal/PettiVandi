import { ParcelStatus } from "@prisma/client";

// Valid transitions: key = current status, value = allowed next statuses
export const VALID_TRANSITIONS: Record<ParcelStatus, ParcelStatus[]> = {
  [ParcelStatus.BOOKED]: [ParcelStatus.LOADED],
  [ParcelStatus.LOADED]: [ParcelStatus.IN_TRANSIT],
  [ParcelStatus.IN_TRANSIT]: [ParcelStatus.UNLOADED],
  [ParcelStatus.UNLOADED]: [ParcelStatus.CLAIMED],
  [ParcelStatus.CLAIMED]: [],
};

export type TransitionErrorCode =
  "INVALID_TRANSITION" | "ALREADY_AT_STATUS" | "FINAL_STATUS";

export interface TransitionResult {
  allowed: boolean;
  code?: TransitionErrorCode;
  message?: string;
}

/**
 * Validates whether a status transition is allowed.
 * Returns { allowed: true } or { allowed: false, code, message }.
 */
export function canTransition(
  currentStatus: ParcelStatus,
  requestedStatus: ParcelStatus,
): TransitionResult {
  // Same status — already there
  if (currentStatus === requestedStatus) {
    return {
      allowed: false,
      code: "ALREADY_AT_STATUS",
      message: `Parcel is already at status ${requestedStatus}. No action needed.`,
    };
  }

  // Final status — nothing more to do
  if (VALID_TRANSITIONS[currentStatus].length === 0) {
    return {
      allowed: false,
      code: "FINAL_STATUS",
      message: `Parcel is at final status ${currentStatus}. No further transitions are possible.`,
    };
  }

  // Check if requested status is a valid next step
  if (!VALID_TRANSITIONS[currentStatus].includes(requestedStatus)) {
    return {
      allowed: false,
      code: "INVALID_TRANSITION",
      message: `Cannot transition from ${currentStatus} to ${requestedStatus}. Valid next status: ${VALID_TRANSITIONS[currentStatus].join(", ")}.`,
    };
  }

  return { allowed: true };
}

/**
 * Returns the single valid next status for a given current status,
 * or null if the parcel is at a final state.
 */
export function getNextStatus(
  currentStatus: ParcelStatus,
): ParcelStatus | null {
  const next = VALID_TRANSITIONS[currentStatus];
  return next.length > 0 ? next[0] : null;
}

/**
 * Human-readable label for each status, used in conductor UI and notifications.
 */
export const STATUS_LABELS: Record<ParcelStatus, string> = {
  [ParcelStatus.BOOKED]: "Booked",
  [ParcelStatus.LOADED]: "Loaded onto Bus",
  [ParcelStatus.IN_TRANSIT]: "In Transit",
  [ParcelStatus.UNLOADED]: "Unloaded at Destination",
  [ParcelStatus.CLAIMED]: "Claimed by Receiver",
};

/**
 * Action label shown on the conductor button for a given current status.
 */
export const ACTION_LABELS: Record<ParcelStatus, string> = {
  [ParcelStatus.BOOKED]: "Confirm Loaded",
  [ParcelStatus.LOADED]: "Confirm In Transit",
  [ParcelStatus.IN_TRANSIT]: "Confirm Unloaded",
  [ParcelStatus.UNLOADED]: "Confirm Claimed",
  [ParcelStatus.CLAIMED]: "Already Claimed",
};

/**
 * WhatsApp notification message for each status transition.
 */
export function getWhatsAppMessage(
  waybillId: string,
  newStatus: ParcelStatus,
  busNumber?: string,
  routeName?: string,
  arrivalDepot?: string,
): string {
  switch (newStatus) {
    case ParcelStatus.LOADED:
      return `Your KSRTC parcel ${waybillId} has been loaded onto bus ${busNumber ?? "N/A"}, en route ${routeName ?? ""}. We'll update you when it arrives.`;
    case ParcelStatus.IN_TRANSIT:
      return `Your KSRTC parcel ${waybillId} is now in transit on bus ${busNumber ?? "N/A"} (${routeName ?? ""}). Expected at ${arrivalDepot ?? "destination depot"} soon.`;
    case ParcelStatus.UNLOADED:
      return `Your KSRTC parcel ${waybillId} has been unloaded at ${arrivalDepot ?? "the destination depot"}. It is ready for collection. Please bring a valid ID and your waybill number.`;
    case ParcelStatus.CLAIMED:
      return `Your KSRTC parcel ${waybillId} has been collected. Thank you for using KSRTC PettiVandi parcel service.`;
    default:
      return `Update on your KSRTC parcel ${waybillId}: status is now ${STATUS_LABELS[newStatus]}.`;
  }
}
