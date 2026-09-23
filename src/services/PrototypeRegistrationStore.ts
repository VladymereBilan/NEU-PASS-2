import type { FaceCheckoutVerificationStatus } from "../types/VisitorRegistration";

import {
  approveVisitor,
  completeCheckout as completeCheckoutRepo,
  getActiveVisitors as getActiveVisitorsRepo,
  getCompletedVisitorsPage as getCompletedVisitorsPageRepo,
  getPendingVisitors as getPendingVisitorsRepo,
  getVisitorById,
  rejectVisitor,
  type CompletedVisitorsCursor,
} from "../repositories/VisitorRepository";

export async function getPendingRegistrations() {
  return getPendingVisitorsRepo();
}

export async function getCompletedRegistrationsPage(
  cursor: CompletedVisitorsCursor | null,
  limit: number
) {
  return getCompletedVisitorsPageRepo(cursor, limit);
}

export async function getActiveVisitors() {
  return getActiveVisitorsRepo();
}

export async function getVisitorPassByVisitorId(id: string) {
  return getVisitorById(id);
}

export async function approveRegistration(id: string) {
  return approveVisitor(id);
}

export async function rejectRegistration(id: string, reason: string) {
  return rejectVisitor(id, reason);
}

export async function markVisitorActive(id: string) {
  return approveVisitor(id);
}

export async function completeCheckout(
  visitorId: string,
  verificationStatus: FaceCheckoutVerificationStatus
) {
  return completeCheckoutRepo(visitorId, verificationStatus);
}