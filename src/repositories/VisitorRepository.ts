import { supabase } from "../lib/supabaseClient";
import type {
  FaceCheckoutVerificationStatus,
  VisitorRegistration
} from "../types/VisitorRegistration";

function mapRow(row: any): VisitorRegistration {
  return {
    id: row.id,
    fullName: row.full_name,
    address: row.address,
    contactNumber: row.contact_number,
    email: row.email,
    idType: row.id_type,
    idNumber: row.id_number,
    idImageUri: row.id_image_path || "",
    purposeOfVisit: row.purpose_of_visit,
    otherAgenda: row.other_agenda || "",
    consentAccepted: !!row.consent_accepted,
    ocrReviewed: !!row.ocr_reviewed,
    faceVerificationStatus: row.face_verification_status,
    faceImageUri: row.face_image_path || "",
    registrationStatus: row.registration_status,
    timeIn: row.time_in || "",
    visitorPassNumber: row.visitor_pass_number || "",
    qrStatus: row.qr_status,
    expirationTime: row.expiration_time || "",
    checkoutStatus: row.checkout_status,
    checkoutRequestedAt: row.checkout_requested_at || "",
    timeOut: row.time_out || "",
    faceCheckoutVerificationStatus: row.face_checkout_verification_status || "",
    createdAt: row.created_at
  };
}

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("No data returned.");
  return data;
}

export async function getVisitorById(id: string) {
  const { data, error } = await supabase
    .from("visitor_registrations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data) : null;
}

export type VisitorStatsRow = {
  purposeOfVisit: string;
  registrationStatus: string;
  checkoutStatus: string;
  qrStatus: string;
  timeIn: string;
  timeOut: string;
  expirationTime: string;
  createdAt: string;
};

// Reports screens only aggregate counts by status/purpose/date — selecting
// just those columns (instead of select("*")) keeps names, addresses,
// contact info, ID numbers, and image paths for every visitor ever
// registered off the wire, since nothing here needs them.
export async function getVisitorStatsRows(): Promise<VisitorStatsRow[]> {
  const { data, error } = await supabase
    .from("visitor_registrations")
    .select(
      "purpose_of_visit, registration_status, checkout_status, qr_status, time_in, time_out, expiration_time, created_at"
    );

  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    purposeOfVisit: row.purpose_of_visit,
    registrationStatus: row.registration_status,
    checkoutStatus: row.checkout_status,
    qrStatus: row.qr_status,
    timeIn: row.time_in || "",
    timeOut: row.time_out || "",
    expirationTime: row.expiration_time || "",
    createdAt: row.created_at
  }));
}

export async function getPendingVisitors() {
  const { data, error } = await supabase
    .from("visitor_registrations")
    .select("*")
    .eq("registration_status", "Pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapRow);
}

export async function getActiveVisitors() {
  const { data, error } = await supabase
    .from("visitor_registrations")
    .select("*")
    .eq("registration_status", "Active")
    .order("time_in", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapRow);
}

// Fetches one page of completed visitors, requesting one extra row over
// `limit` so the caller can tell whether more pages remain without a
// separate (more expensive) exact-count query. Paginated by a `time_out`
// cursor rather than a numeric offset — the table keeps growing as other
// guards complete checkouts, and a numeric offset into a DESC-ordered list
// that's actively growing at the front skips/duplicates rows across pages.
export async function getCompletedVisitorsPage(cursor: string | null, limit: number) {
  let query = supabase
    .from("visitor_registrations")
    .select("*")
    .eq("checkout_status", "Completed")
    .order("time_out", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("time_out", cursor);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  const rows = data || [];
  return {
    visitors: rows.slice(0, limit).map(mapRow),
    hasMore: rows.length > limit
  };
}

export async function approveVisitor(id: string) {
  const { data, error } = await supabase.rpc("approve_visitor", { p_id: id });
  return mapRow(unwrap(data, error));
}

export async function rejectVisitor(id: string) {
  const { data, error } = await supabase.rpc("reject_visitor", { p_id: id });
  return mapRow(unwrap(data, error));
}

export async function requestCheckout(id: string) {
  const { data, error } = await supabase.rpc("request_checkout", { p_id: id });
  return mapRow(unwrap(data, error));
}

export async function completeCheckout(
  id: string,
  verificationStatus: FaceCheckoutVerificationStatus
) {
  const { data, error } = await supabase.rpc("complete_checkout", {
    p_id: id,
    p_face_status: verificationStatus || null
  });
  return mapRow(unwrap(data, error));
}
