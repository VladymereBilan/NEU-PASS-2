"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createAdminAccount,
  createGuardAccount,
  getOwnAccount,
  listAdminAccounts,
  listGuardAccounts,
  resetAccountPassword,
  setAdminAccountStatus,
  setGuardAccountStatus,
  updateOwnRecoveryEmail,
  type AccountStatus,
  type AdminAccount,
  type GuardAccount
} from "@/actions/accounts";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SearchIcon } from "@/components/icons";
import { passwordPolicyError } from "@/lib/passwordPolicy";
import { usernamePolicyError } from "@/lib/usernamePolicy";

export default function UsersPage() {
  const [guards, setGuards] = useState<GuardAccount[]>([]);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      setError("");
      const [guardData, adminData] = await Promise.all([listGuardAccounts(), listAdminAccounts()]);
      setGuards(guardData);
      setAdmins(adminData);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Unable to load accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
          {error}
        </div>
      ) : null}
      <div className="max-w-2xl">
        <MyAccountSection />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <GuardAccountsSection guards={guards} loading={loading} onChanged={refresh} />
        </div>
        <div className="space-y-6">
          <AdminAccountsSection admins={admins} loading={loading} onChanged={refresh} />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 border-b border-emerald-500/10 pb-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{eyebrow}</div>
          <h2 className="mt-1 text-lg font-bold text-white">{title}</h2>
        </div>
        {action}
      </div>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function CountBadge({ loading, count }: { loading: boolean; count: number }) {
  return (
    <span className="whitespace-nowrap rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
      {loading ? "Loading..." : `${count} account(s)`}
    </span>
  );
}

function MyAccountSection() {
  const [username, setUsername] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const account = await getOwnAccount();
        setUsername(account.username);
        setRecoveryEmail(account.recoveryEmail ?? "");
      } catch (exception) {
        setError(exception instanceof Error ? exception.message : "Unable to load your account.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await updateOwnRecoveryEmail(recoveryEmail);
      setMessage("Recovery email updated.");
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Unable to update recovery email.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-emerald-500/20 bg-[#0a1f14]/80 p-6 backdrop-blur-sm">
      <SectionHeader
        eyebrow="Account Settings"
        title="My Account"
        description={'Set a personal recovery email so you can reset your own password from the login page’s “Forgot password?” link if you’re ever locked out.'}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Username</div>
          <input
            value={loading ? "Loading..." : `@${username}`}
            disabled
            className="w-full rounded-2xl border border-emerald-500/15 bg-white/5 px-4 py-3 text-gray-400"
          />
        </label>
        <Field
          label="Recovery Email"
          value={recoveryEmail}
          onChange={setRecoveryEmail}
          type="email"
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
          {error}
        </p>
      ) : message ? (
        <p className="mt-4 text-sm font-medium text-emerald-400">{message}</p>
      ) : null}

      <div className="mt-5 border-t border-emerald-500/10 pt-5">
        <button
          onClick={() => void handleSave()}
          disabled={loading || saving}
          className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-[#04150c] hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Recovery Email"}
        </button>
      </div>
    </section>
  );
}

function GuardAccountsSection({
  guards,
  loading,
  onChanged
}: {
  guards: GuardAccount[];
  loading: boolean;
  onChanged: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("Active");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    return guards.filter((account) => {
      const value = search.trim().toLowerCase();
      if (!value) return true;
      return (
        account.fullName.toLowerCase().includes(value) ||
        account.username.toLowerCase().includes(value)
      );
    });
  }, [guards, search]);

  const handleCreate = async () => {
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      setError("All guard account fields are required.");
      return;
    }

    const usernameError = usernamePolicyError(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    const passwordErrorMessage = passwordPolicyError(password);
    if (passwordErrorMessage) {
      setError(passwordErrorMessage);
      return;
    }

    try {
      setError("");
      await createGuardAccount({ fullName, username, password, accountStatus });
      await onChanged();
      setFullName("");
      setUsername("");
      setPassword("");
      setAccountStatus("Active");
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Unable to create guard account.");
    }
  };

  const toggleStatus = async (account: GuardAccount) => {
    const nextStatus: AccountStatus = account.accountStatus === "Active" ? "Blocked" : "Active";
    await setGuardAccountStatus(account.id, nextStatus);
    await onChanged();
  };

  return (
    <>
      <section className="rounded-3xl border border-emerald-500/20 bg-[#0a1f14]/80 p-6 backdrop-blur-sm">
        <SectionHeader
          eyebrow="Guard Management"
          title="Create Guard Account"
          description="Guard accounts are admin-managed only. Guards cannot self-register."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Juan dela Cruz" />
          <Field label="Username" value={username} onChange={setUsername} placeholder="guard_juan" />
          <Field label="Password" value={password} onChange={setPassword} type="password" />
          <label className="block">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Account Status
            </div>
            <select
              value={accountStatus}
              onChange={(event) => setAccountStatus(event.target.value as AccountStatus)}
              className="w-full rounded-2xl border border-emerald-500/20 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20"
            >
              <option value="Active" className="bg-[#0a1f14] text-white">Active</option>
              <option value="Blocked" className="bg-[#0a1f14] text-white">Blocked</option>
            </select>
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-5 border-t border-emerald-500/10 pt-5">
          <button
            onClick={() => void handleCreate()}
            className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-[#04150c] hover:bg-emerald-400"
          >
            + Create Guard Account
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-500/20 bg-[#0a1f14]/80 p-6 backdrop-blur-sm">
        <SectionHeader
          eyebrow="Guard Roster"
          title="Guard Accounts"
          description="Block, unblock, or reset a guard's password."
          action={<CountBadge loading={loading} count={filtered.length} />}
        />

        <label className="relative mb-4 block">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search guards..."
            className="w-full rounded-2xl border border-emerald-500/20 bg-white/5 py-3 pl-11 pr-4 text-white outline-none placeholder:text-gray-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20"
          />
        </label>

        <div className="space-y-3">
          {filtered.map((account) => (
            <AccountRow
              key={account.id}
              fullName={account.fullName}
              username={account.username}
              status={account.accountStatus}
              role="Guard"
              onToggleStatus={() => toggleStatus(account)}
              onResetPassword={(newPassword) => resetAccountPassword(account.id, newPassword)}
            />
          ))}

          {!loading && filtered.length === 0 ? (
            <div className="py-10 text-center text-gray-400">No guard accounts found.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function AdminAccountsSection({
  admins,
  loading,
  onChanged
}: {
  admins: AdminAccount[];
  loading: boolean;
  onChanged: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ownId, setOwnId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const own = await getOwnAccount();
        setOwnId(own.id);
      } catch {
        // Non-fatal — self-block prevention just falls back to the server's
        // own check if this doesn't resolve in time.
      }
    })();
  }, []);

  const toggleStatus = async (account: AdminAccount) => {
    const nextStatus: AccountStatus = account.accountStatus === "Active" ? "Blocked" : "Active";
    await setAdminAccountStatus(account.id, nextStatus);
    await onChanged();
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      setError("All admin account fields are required.");
      return;
    }

    const usernameError = usernamePolicyError(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    const passwordErrorMessage = passwordPolicyError(password);
    if (passwordErrorMessage) {
      setError(passwordErrorMessage);
      return;
    }

    try {
      setError("");
      await createAdminAccount({ fullName, username, password });
      await onChanged();
      setFullName("");
      setUsername("");
      setPassword("");
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Unable to create admin account.");
    }
  };

  return (
    <>
      <section className="rounded-3xl border border-emerald-500/20 bg-[#0a1f14]/80 p-6 backdrop-blur-sm">
        <SectionHeader
          eyebrow="Admin Management"
          title="Create Admin Account"
          description="Admin accounts have full access to this console. Only create one for someone you trust."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Admin Name" />
          <Field label="Username" value={username} onChange={setUsername} placeholder="admin_name" />
          <div className="sm:col-span-2">
            <Field label="Password" value={password} onChange={setPassword} type="password" />
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-5 border-t border-emerald-500/10 pt-5">
          <button
            onClick={() => void handleCreate()}
            className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-[#04150c] hover:bg-emerald-400"
          >
            + Create Admin Account
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-500/20 bg-[#0a1f14]/80 p-6 backdrop-blur-sm">
        <SectionHeader
          eyebrow="Admin Roster"
          title="Admin Accounts"
          description="Reset an admin's password if they've lost it."
          action={<CountBadge loading={loading} count={admins.length} />}
        />

        <div className="space-y-3">
          {admins.map((account) => (
            <AccountRow
              key={account.id}
              fullName={account.fullName}
              username={account.username}
              status={account.accountStatus}
              role="Administrator"
              isSelf={ownId === account.id}
              onToggleStatus={ownId === account.id ? undefined : () => toggleStatus(account)}
              onResetPassword={(newPassword) => resetAccountPassword(account.id, newPassword)}
            />
          ))}

          {!loading && admins.length === 0 ? (
            <div className="py-10 text-center text-gray-400">No admin accounts found.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function AccountRow({
  fullName,
  username,
  status,
  role,
  isSelf,
  onToggleStatus,
  onResetPassword
}: {
  fullName: string;
  username: string;
  status?: AccountStatus;
  role: string;
  isSelf?: boolean;
  onToggleStatus?: () => Promise<void>;
  onResetPassword: (newPassword: string) => Promise<void>;
}) {
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");

  const handleToggleStatus = async () => {
    if (!onToggleStatus || statusSaving) return;
    try {
      setStatusSaving(true);
      setStatusError("");
      await onToggleStatus();
    } catch (exception) {
      setStatusError(exception instanceof Error ? exception.message : "Unable to update account status.");
    } finally {
      setStatusSaving(false);
    }
  };

  const openReset = () => {
    setResetting((value) => !value);
    setResetError("");
    setResetMessage("");
    setNewPassword("");
  };

  const handleReset = async () => {
    const policyError = passwordPolicyError(newPassword.trim());
    if (policyError) {
      setResetError(policyError);
      return;
    }

    try {
      setSaving(true);
      setResetError("");
      await onResetPassword(newPassword.trim());
      setNewPassword("");
      setResetMessage("Password updated.");
    } catch (exception) {
      setResetError(exception instanceof Error ? exception.message : "Unable to reset password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/15 bg-white/5 p-3.5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-[#04150c]">
            {fullName.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <div className="font-medium text-white">
              {fullName}
              {isSelf ? <span className="ml-2 text-xs font-normal text-emerald-400">(You)</span> : null}
            </div>
            <div className="text-sm text-gray-400">
              @{username} · {role}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status ? (
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                status === "Active"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {status}
            </span>
          ) : null}
          {onToggleStatus ? (
            <ConfirmButton
              label={statusSaving ? "Saving..." : status === "Active" ? "Block" : "Unblock"}
              confirmLabel={status === "Active" ? "Confirm Block" : "Confirm Unblock"}
              disabled={statusSaving}
              onConfirm={() => void handleToggleStatus()}
              className={`rounded-2xl px-3.5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                status === "Active"
                  ? "border border-emerald-500/20 bg-white/5 text-white hover:bg-white/10"
                  : "bg-emerald-500 text-[#04150c] hover:bg-emerald-400"
              }`}
            />
          ) : isSelf ? (
            <span className="rounded-2xl border border-emerald-500/10 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-gray-500">
              Can&apos;t block your own account
            </span>
          ) : null}
          <button
            onClick={openReset}
            className="rounded-2xl border border-emerald-500/20 bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            {resetting ? "Cancel" : "Reset PW"}
          </button>
        </div>
      </div>

      {resetting ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-emerald-500/15 pt-4 sm:flex-row sm:items-center">
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password"
            className="w-full max-w-xs rounded-2xl border border-emerald-500/20 bg-white/5 px-4 py-2.5 text-white outline-none placeholder:text-gray-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20"
          />
          <ConfirmButton
            label={saving ? "Saving..." : "Save Password"}
            confirmLabel="Confirm New Password"
            disabled={saving}
            onConfirm={() => void handleReset()}
            className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#04150c] hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      ) : null}

      {statusError ? (
        <p className="mt-2 text-sm font-medium text-red-400">{statusError}</p>
      ) : null}

      {resetError ? (
        <p className="mt-2 text-sm font-medium text-red-400">{resetError}</p>
      ) : resetMessage ? (
        <p className="mt-2 text-sm font-medium text-emerald-400">{resetMessage}</p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-emerald-500/20 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20"
      />
    </label>
  );
}
