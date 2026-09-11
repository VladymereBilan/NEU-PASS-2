"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminUsernameToEmail, guardUsernameToEmail } from "@/lib/syntheticAuth";
import { escapeLikePattern } from "@/lib/likeEscape";
import { passwordPolicyError } from "@/lib/passwordPolicy";
import { usernamePolicyError } from "@/lib/usernamePolicy";

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
    .select("account_type, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "admin") {
    throw new Error("Only admins can perform this action.");
  }

  if (profile?.account_status !== "Active") {
    throw new Error("Your admin account has been blocked.");
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
  accountStatus: AccountStatus;
  createdAt: string;
};

// Postgres unique-violation error code — used to give a friendly message
// when a race between the pre-check and the insert lets two concurrent
// requests both attempt the same username.
const UNIQUE_VIOLATION = "23505";

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

// Shared by createGuardAccount/createAdminAccount: creates the Auth user,
// then promotes the trigger-created default profile row to the right
// account_type/username. If that second step fails for any reason, the Auth
// user is deleted again rather than left behind as an orphaned account stuck
// at the trigger's default account_type='visitor' with no username.
async function createManagedAccount(input: {
  accountType: "guard" | "admin";
  fullName: string;
  username: string;
  password: string;
  accountStatus: AccountStatus;
  toEmail: (username: string) => string;
  duplicateMessage: string;
}) {
  const admin = createAdminClient();

  // Pre-check against `profiles` (not auth.admin.listUsers, which paginates
  // and could miss an existing match) so a duplicate username is rejected
  // before an auth user is ever created — avoids leaving an orphaned
  // auth.users row behind in the common case. A concurrent request can still
  // race past this check; the unique-violation handling below on the actual
  // write is what closes that gap.
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("account_type", input.accountType)
    .ilike("username", escapeLikePattern(input.username))
    .maybeSingle();

  if (existingProfile) {
    throw new Error(input.duplicateMessage);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.toEmail(input.username),
    password: input.password,
    email_confirm: true
  });

  if (createError) {
    throw new Error(createError.message);
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      account_type: input.accountType,
      username: input.username,
      full_name: input.fullName,
      account_status: input.accountStatus
    })
    .eq("id", created.user.id);

  if (updateError) {
    // Roll back the just-created Auth user so it doesn't linger as an
    // invisible, functioning login with no matching guard/admin profile.
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});

    if (updateError.code === UNIQUE_VIOLATION) {
      throw new Error(input.duplicateMessage);
    }
    throw new Error(updateError.message);
  }

  return { id: created.user.id };
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

  const usernameError = usernamePolicyError(username);
  if (usernameError) throw new Error(usernameError);

  const passwordError = passwordPolicyError(password);
  if (passwordError) throw new Error(passwordError);

  return createManagedAccount({
    accountType: "guard",
    fullName,
    username,
    password,
    accountStatus: input.accountStatus,
    toEmail: guardUsernameToEmail,
    duplicateMessage: "A guard account already exists for this username."
  });
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
    .select("id, full_name, username, account_status, created_at")
    .eq("account_type", "admin")
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

  const usernameError = usernamePolicyError(username);
  if (usernameError) throw new Error(usernameError);

  const passwordError = passwordPolicyError(password);
  if (passwordError) throw new Error(passwordError);

  return createManagedAccount({
    accountType: "admin",
    fullName,
    username,
    password,
    accountStatus: "Active",
    toEmail: adminUsernameToEmail,
    duplicateMessage: "An admin account already exists for this username."
  });
}

// Admins can block one another (e.g. a departing or compromised account) but
// never their own — otherwise a single admin could lock every admin out at
// once with no one left able to undo it.
export async function setAdminAccountStatus(id: string, status: AccountStatus) {
  const user = await requireAdmin();

  if (id === user.id) {
    throw new Error("You cannot change the status of your own account.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ account_status: status })
    .eq("id", id)
    .eq("account_type", "admin");

  if (error) throw new Error(error.message);
}

export async function getOwnAccount(): Promise<{
  id: string;
  username: string;
  recoveryEmail: string | null;
}> {
  const user = await requireAdmin();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("username, recovery_email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    id: user.id,
    username: data?.username ?? "",
    recoveryEmail: data?.recovery_email ?? null
  };
}

// Only ever writes the caller's own row (scoped by their own auth.uid()), so
// this is safe to expose without the "which account am I touching" checks
// the id-taking functions below need.
export async function updateOwnRecoveryEmail(email: string) {
  const user = await requireAdmin();

  const trimmed = email.trim();
  if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("Enter a valid email address.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ recovery_email: trimmed || null })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}

// Shared by both guard and admin rows. Only ever targets a profile this
// admin console itself manages — never a visitor — since a Server Action is
// reachable directly over the network and the caller controls `id`.
export async function resetAccountPassword(id: string, newPassword: string) {
  await requireAdmin();

  const password = newPassword.trim();
  const passwordError = passwordPolicyError(password);
  if (passwordError) throw new Error(passwordError);

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
