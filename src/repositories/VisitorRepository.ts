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

// Postgres ILIKE treats "_" and "%" as wildcards; escape them so an
// email-address lookup (which commonly contains "_") only ever matches
// exactly, case-insensitively, and can't unintentionally match other rows.
function escapeIlike(value: string) {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("No data returned.");
  return data;
}

export async function createVisitor(visitor: VisitorRegistration) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in to register a visit.");
  }

  const { data, error } = await supabase
    .from("visitor_registrations")
    .insert({
      visitor_user_id: userData.user.id,
      full_name: visitor.fullName,
      address: visitor.address,
      contact_number: visitor.contactNumber,
      email: visitor.email,
      id_type: visitor.idType,
      id_number: visitor.idNumber,
      id_image_path: visitor.idImageUri || null,
      purpose_of_visit: visitor.purposeOfVisit,
      other_agenda: visitor.otherAgenda || null,
      consent_accepted: visitor.consentAccepted,
      ocr_reviewed: visitor.ocrReviewed,
      face_verification_status: visitor.faceVerificationStatus,
      face_image_path: visitor.faceImageUri || null
    })
    .select()
    .single();

  return mapRow(unwrap(data, error));
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

export async function getAllVisitors() {
  const { data, error } = await supabase
    .from("visitor_registrations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapRow);
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

export async function getActiveVisitorsByEmail(email: string) {
  const { data, error } = await supabase
    .from("visitor_registrations")
    .select("*")
    .eq("registration_status", "Active")
    .ilike("email", escapeIlike(email.trim()))
    .order("time_in", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapRow);
}

// Unlike getActiveVisitorsByEmail (Active only), this returns the visitor's
// most recent registration regardless of status — what the visitor home
// dashboard needs to show "Pending approval" / "Rejected" states too, not
// just an active pass.
export async function getLatestVisitorRegistrationByEmail(email: string) {
  const { data, error } = await supabase
    .from("visitor_registrations")
    .select("*")
    .ilike("email", escapeIlike(email.trim()))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data) : null;
}

export async function getCheckoutRequests() {
  const { data, error } = await supabase
    .from("visitor_registrations")
    .select("*")
    .eq("checkout_status", "Checkout Requested")
    .order("checkout_requested_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapRow);
}

export async function getCompletedVisitors() {
  const { data, error } = await supabase
    .from("visitor_registrations")
    .select("*")
    .eq("checkout_status", "Completed")
    .order("time_out", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapRow);
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
