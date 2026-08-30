"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminUsernameToEmail, guardUsernameToEmail } from "@/lib/syntheticAuth";

// Server Actions are callable directly over the network by anyone who can
// reach this app, regardless of which page renders the button that
// triggers them — so every action here must independently verify the
// caller is a signed-in admin before touching the service_role client.
// Never skip this just because the page that calls it happens to be
// behind the (protected) layout's own check.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "admin") {
    throw new Error("Only admins can perform this action.");
  }

  return user;
}

export type AccountStatus = "Active" | "Blocked";

export type GuardAccount = {
  id: string;
  fullName: string;
  username: string;
  accountStatus: AccountStatus;
  createdAt: string;
};

export type AdminAccount = {
  id: string;
  fullName: string;
  username: string;
  createdAt: string;
};

export async function listGuardAccounts(): Promise<GuardAccount[]> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, account_status, created_at")
    .eq("account_type", "guard")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    username: row.username ?? "",
    accountStatus: row.account_status as AccountStatus,
    createdAt: row.created_at
  }));
}

export async function createGuardAccount(input: {
  fullName: string;
  username: string;
  password: string;
  accountStatus: AccountStatus;
}) {
  await requireAdmin();

  const fullName = input.fullName.trim();
  const username = input.username.trim();
  const password = input.password.trim();

  if (!fullName || !username || !password) {
    throw new Error("All guard account fields are required.");
  }

  const admin = createAdminClient();

  // Pre-check against `profiles` (not auth.admin.listUsers, which paginates
  // and could miss an existing match) so a duplicate username is rejected
  // before an auth user is ever created — avoids leaving an orphaned
  // auth.users row behind when the later profiles UPDATE would otherwise be
  // the thing that fails on the unique index.
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("account_type", "guard")
    .ilike("username", username)
    .maybeSingle();

  if (existingProfile) {
    throw new Error("A guard account already exists for this username.");
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: guardUsernameToEmail(username),
    password,
    email_confirm: true
  });

  if (createError) {
    throw new Error(createError.message);
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      account_type: "guard",
      username,
      full_name: fullName,
      account_status: input.accountStatus
    })
    .eq("id", created.user.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { id: created.user.id };
}

export async function setGuardAccountStatus(id: string, status: AccountStatus) {
  await requireAdmin();

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ account_status: status })
    .eq("id", id)
    .eq("account_type", "guard");

  if (error) throw new Error(error.message);
}

export async function listAdminAccounts(): Promise<AdminAccount[]> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, created_at")
    .eq("account_type", "admin")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    username: row.username ?? "",
    createdAt: row.created_at
  }));
}

export async function createAdminAccount(input: {
  fullName: string;
  username: string;
  password: string;
}) {
  await requireAdmin();

  const fullName = input.fullName.trim();
  const username = input.username.trim();
  const password = input.password.trim();

  if (!fullName || !username || !password) {
    throw new Error("All admin account fields are required.");
  }

  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("account_type", "admin")
    .ilike("username", username)
    .maybeSingle();

  if (existingProfile) {
    throw new Error("An admin account already exists for this username.");
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: adminUsernameToEmail(username),
    password,
    email_confirm: true
  });

  if (createError) {
    throw new Error(createError.message);
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      account_type: "admin",
      username,
      full_name: fullName,
      account_status: "Active"
    })
    .eq("id", created.user.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { id: created.user.id };
}

// Shared by both guard and admin rows. Only ever targets a profile this
// admin console itself manages — never a visitor — since a Server Action is
// reachable directly over the network and the caller controls `id`.
export async function resetAccountPassword(id: string, newPassword: string) {
  await requireAdmin();

  const password = newPassword.trim();
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const admin = createAdminClient();
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("account_type")
    .eq("id", id)
    .maybeSingle();

  if (targetProfile?.account_type !== "guard" && targetProfile?.account_type !== "admin") {
    throw new Error("Can only reset passwords for guard or admin accounts.");
  }

  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) throw new Error(error.message);
}
