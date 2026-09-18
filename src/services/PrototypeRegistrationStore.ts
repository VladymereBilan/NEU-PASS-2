import type { FaceCheckoutVerificationStatus } from "../types/VisitorRegistration";

import {
  approveVisitor,
  completeCheckout as completeCheckoutRepo,
  getActiveVisitors as getActiveVisitorsRepo,
  getCompletedVisitorsPage as getCompletedVisitorsPageRepo,
  getPendingVisitors as getPendingVisitorsRepo,
  getVisitorById,
  rejectVisitor,
} from "../repositories/VisitorRepository";

export async function getPendingRegistrations() {
  return getPendingVisitorsRepo();
}

export async function getCompletedRegistrationsPage(offset: number, limit: number) {
  return getCompletedVisitorsPageRepo(offset, limit);
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

export async function rejectRegistration(id: string) {
  return rejectVisitor(id);
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