import type {
  FaceCheckoutVerificationStatus,
  RegistrationStatus,
  VisitorRegistration,
} from "../types/VisitorRegistration";

import {
  approveVisitor,
  completeCheckout as completeCheckoutRepo,
  createVisitor,
  getActiveVisitors as getActiveVisitorsRepo,
  getActiveVisitorsByEmail,
  getAllVisitors as getAllVisitorsRepo,
  getCheckoutRequests as getCheckoutRequestsRepo,
  getLatestVisitorRegistrationByEmail,
  getPendingVisitors as getPendingVisitorsRepo,
  getVisitorById,
  rejectVisitor,
  requestCheckout as requestCheckoutRepo,
} from "../repositories/VisitorRepository";

export async function addRegistration(registration: VisitorRegistration) {
  return createVisitor(registration);
}

export async function getPendingRegistrations() {
  return getPendingVisitorsRepo();
}

export async function getAllRegistrations() {
  return getAllVisitorsRepo();
}

export async function getActiveVisitors() {
  return getActiveVisitorsRepo();
}

export async function getLatestApprovedOrActiveVisitor(email: string) {
  const active = await getActiveVisitorsByEmail(email);

  if (active.length === 0) {
    return null;
  }

  return [...active].sort((a, b) => {
    return (
      new Date(b.timeIn || b.createdAt).getTime() -
      new Date(a.timeIn || a.createdAt).getTime()
    );
  })[0];
}

export async function getLatestVisitorRegistration(email: string) {
  return getLatestVisitorRegistrationByEmail(email);
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

export async function updateRegistrationStatus(
  id: string,
  status: RegistrationStatus
) {
  if (status === "Active") {
    return approveVisitor(id);
  }

  if (status === "Rejected") {
    return rejectVisitor(id);
  }

  throw new Error(`Unsupported status update: ${status}`);
}

export async function requestCheckout(visitorId: string) {
  return requestCheckoutRepo(visitorId);
}

export async function getCheckoutRequests() {
  return getCheckoutRequestsRepo();
}

export async function completeCheckout(
  visitorId: string,
  verificationStatus: FaceCheckoutVerificationStatus
) {
  return completeCheckoutRepo(visitorId, verificationStatus);
}