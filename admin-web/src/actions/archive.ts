"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/requireAdmin";

// Manually triggers the "monthly-archive" Edge Function (see
// supabase/functions/monthly-archive/index.ts) on demand — the same
// function pg_cron calls on its schedule. Lets an admin dry-run or force
// an off-cycle archive+purge instead of waiting for the 1st of the month.
//
// createAdminClient() authenticates the function call with the
// service_role key automatically (functions.invoke sends it as the
// Authorization header), matching what the Edge Function's own auth gate
// expects. This action still independently verifies the caller is an
// active admin first — Server Actions are reachable directly over the
// network regardless of which page renders their trigger button.
export async function runMonthlyArchiveNow(): Promise<{ message: string }> {
  await requireAdmin();

  const admin = createAdminClient();
  const { data, error } = await admin.functions.invoke("monthly-archive", {
    method: "POST"
  });

  if (error) {
    throw new Error(error.message || "Monthly archive run failed.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return { message: data?.message ?? "Archive run completed." };
}
