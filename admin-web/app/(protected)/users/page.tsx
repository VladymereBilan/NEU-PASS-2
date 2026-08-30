"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createAdminAccount,
  createGuardAccount,
  listAdminAccounts,
  listGuardAccounts,
  resetAccountPassword,
  setGuardAccountStatus,
  type AccountStatus,
  type AdminAccount,
  type GuardAccount
} from "@/actions/accounts";

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
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}
      <GuardAccountsSection guards={guards} loading={loading} onChanged={refresh} />
      <AdminAccountsSection admins={admins} loading={loading} onChanged={refresh} />
    </div>
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
      <section className="rounded-3xl border border-[#d8e3dc] bg-white p-6 shadow-[0_10px_28px_rgba(11,110,60,0.06)]">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#111827]">Create Guard Account</h2>
          <p className="text-sm text-[#4b5563]">
            Guard accounts are admin-managed only. Capstone 2 will replace the prototype password storage and authentication flow.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Guard Full Name" value={fullName} onChange={setFullName} />
          <Field label="Username" value={username} onChange={setUsername} />
          <Field label="Password" value={password} onChange={setPassword} type="password" />
          <label className="block">
            <div className="mb-2 text-sm font-semibold text-[#374151]">Account Status</div>
            <select
              value={accountStatus}
              onChange={(event) => setAccountStatus(event.target.value as AccountStatus)}
              className="w-full rounded-2xl border border-[#d8e3dc] bg-[#f9fbf9] px-4 py-3 text-[#111827] outline-none focus:border-[#0b6e3c] focus:ring-4 focus:ring-[#eaf5ee]"
            >
              <option value="Active">Active</option>
              <option value="Blocked">Blocked</option>
            </select>
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => void handleCreate()}
            className="rounded-2xl bg-[#0b6e3c] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0e7f49]"
          >
            Create Guard Account
          </button>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search guards"
            className="w-full max-w-xs rounded-2xl border border-[#d8e3dc] bg-[#f9fbf9] px-4 py-3 text-[#111827] outline-none focus:border-[#0b6e3c] focus:ring-4 focus:ring-[#eaf5ee]"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-[#d8e3dc] bg-white p-6 shadow-[0_10px_28px_rgba(11,110,60,0.06)]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">Guard Accounts</h2>
            <p className="text-sm text-[#4b5563]">
              Block and unblock guard access, or reset a guard's password.
            </p>
          </div>
          <div className="text-sm text-[#4b5563]">
            {loading ? "Loading..." : `${filtered.length} account(s)`}
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((account) => (
            <AccountRow
              key={account.id}
              fullName={account.fullName}
              username={account.username}
              status={account.accountStatus}
              onToggleStatus={() => toggleStatus(account)}
              onResetPassword={(newPassword) => resetAccountPassword(account.id, newPassword)}
            />
          ))}

          {!loading && filtered.length === 0 ? (
            <div className="py-10 text-center text-[#4b5563]">No guard accounts found.</div>
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

  const handleCreate = async () => {
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      setError("All admin account fields are required.");
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
      <section className="rounded-3xl border border-[#d8e3dc] bg-white p-6 shadow-[0_10px_28px_rgba(11,110,60,0.06)]">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#111827]">Create Admin Account</h2>
          <p className="text-sm text-[#4b5563]">
            Admin accounts have full access to this console. Only create one for someone you trust.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Admin Full Name" value={fullName} onChange={setFullName} />
          <Field label="Username" value={username} onChange={setUsername} />
          <Field label="Password" value={password} onChange={setPassword} type="password" />
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5">
          <button
            onClick={() => void handleCreate()}
            className="rounded-2xl bg-[#0b6e3c] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0e7f49]"
          >
            Create Admin Account
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[#d8e3dc] bg-white p-6 shadow-[0_10px_28px_rgba(11,110,60,0.06)]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">Admin Accounts</h2>
            <p className="text-sm text-[#4b5563]">Reset an admin's password if they've lost it.</p>
          </div>
          <div className="text-sm text-[#4b5563]">
            {loading ? "Loading..." : `${admins.length} account(s)`}
          </div>
        </div>

        <div className="space-y-4">
          {admins.map((account) => (
            <AccountRow
              key={account.id}
              fullName={account.fullName}
              username={account.username}
              onResetPassword={(newPassword) => resetAccountPassword(account.id, newPassword)}
            />
          ))}

          {!loading && admins.length === 0 ? (
            <div className="py-10 text-center text-[#4b5563]">No admin accounts found.</div>
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
  onToggleStatus,
  onResetPassword
}: {
  fullName: string;
  username: string;
  status?: AccountStatus;
  onToggleStatus?: () => void;
  onResetPassword: (newPassword: string) => Promise<void>;
}) {
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const openReset = () => {
    setResetting((value) => !value);
    setResetError("");
    setResetMessage("");
    setNewPassword("");
  };

  const handleReset = async () => {
    if (newPassword.trim().length < 6) {
      setResetError("Password must be at least 6 characters.");
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
    <div className="rounded-2xl border border-[#d8e3dc] bg-[#f9fbf9] p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-medium text-[#111827]">{fullName}</div>
          <div className="text-sm text-[#4b5563]">@{username}</div>
          {status ? <div className="text-xs text-[#6b7280]">Status: {status}</div> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {onToggleStatus ? (
            <button
              onClick={onToggleStatus}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                status === "Active"
                  ? "border border-[#d8e3dc] bg-white text-[#111827] hover:bg-[#f5faf6]"
                  : "bg-[#0b6e3c] text-white hover:bg-[#0e7f49]"
              }`}
            >
              {status === "Active" ? "Block" : "Unblock"}
            </button>
          ) : null}
          <button
            onClick={openReset}
            className="rounded-2xl border border-[#d8e3dc] bg-white px-4 py-3 text-sm font-semibold text-[#111827] hover:bg-[#f5faf6]"
          >
            {resetting ? "Cancel" : "Reset Password"}
          </button>
        </div>
      </div>

      {resetting ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-[#e5e7eb] pt-4 sm:flex-row sm:items-center">
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password"
            className="w-full max-w-xs rounded-2xl border border-[#d8e3dc] bg-white px-4 py-2.5 text-[#111827] outline-none focus:border-[#0b6e3c] focus:ring-4 focus:ring-[#eaf5ee]"
          />
          <button
            onClick={() => void handleReset()}
            disabled={saving}
            className="rounded-2xl bg-[#0b6e3c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e7f49] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Password"}
          </button>
        </div>
      ) : null}

      {resetError ? (
        <p className="mt-2 text-sm font-medium text-red-700">{resetError}</p>
      ) : resetMessage ? (
        <p className="mt-2 text-sm font-medium text-[#0b6e3c]">{resetMessage}</p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-[#374151]">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[#d8e3dc] bg-[#f9fbf9] px-4 py-3 text-[#111827] outline-none focus:border-[#0b6e3c] focus:ring-4 focus:ring-[#eaf5ee]"
      />
    </label>
  );
}
