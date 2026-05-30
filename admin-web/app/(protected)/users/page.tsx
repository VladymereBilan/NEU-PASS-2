"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createGuardAccount,
  loadGuardAccounts,
  type GuardAccount,
  type GuardAccountStatus,
  updateGuardAccountStatus
} from "@/lib/guard-account-store";

export default function UsersPage() {
  const [accounts, setAccounts] = useState<GuardAccount[]>([]);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accountStatus, setAccountStatus] = useState<GuardAccountStatus>("Active");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const data = await loadGuardAccounts();
      setAccounts(data);
      setLoading(false);
    };

    void bootstrap();
  }, []);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const value = search.trim().toLowerCase();
      if (!value) return true;
      return (
        account.fullName.toLowerCase().includes(value) ||
        account.username.toLowerCase().includes(value)
      );
    });
  }, [accounts, search]);

  const handleCreate = async () => {
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      setError("All guard account fields are required.");
      return;
    }

    try {
      setError("");
      const next = await createGuardAccount({
        fullName,
        username,
        password,
        accountStatus
      });
      setAccounts(next);
      setFullName("");
      setUsername("");
      setPassword("");
      setAccountStatus("Active");
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Unable to create guard account.");
    }
  };

  const toggleStatus = async (account: GuardAccount) => {
    const nextStatus: GuardAccountStatus =
      account.accountStatus === "Active" ? "Blocked" : "Active";
    const next = await updateGuardAccountStatus(account.id, nextStatus);
    setAccounts(next);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-[rgba(13,23,40,0.92)] p-6 shadow-glow">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">Create Guard Account</h2>
          <p className="text-sm text-slate-400">
            Guard accounts are admin-managed only. Capstone 2 will replace the prototype password storage and authentication flow.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Guard Full Name" value={fullName} onChange={setFullName} />
          <Field label="Username" value={username} onChange={setUsername} />
          <Field label="Password" value={password} onChange={setPassword} type="password" />
          <label className="block">
            <div className="mb-2 text-sm text-slate-300">Account Status</div>
            <select
              value={accountStatus}
              onChange={(event) => setAccountStatus(event.target.value as GuardAccountStatus)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            >
              <option value="Active">Active</option>
              <option value="Blocked">Blocked</option>
            </select>
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={handleCreate}
            className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Create Guard Account
          </button>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search guards"
            className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[rgba(13,23,40,0.92)] p-6 shadow-glow">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Guard Accounts</h2>
            <p className="text-sm text-slate-400">
              Block and unblock guard access from the admin console.
            </p>
          </div>
          <div className="text-sm text-slate-400">
            {loading ? "Loading..." : `${filteredAccounts.length} account(s)`}
          </div>
        </div>

        <div className="space-y-4">
          {filteredAccounts.map((account) => (
            <div
              key={account.id}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="text-white">{account.fullName}</div>
                <div className="text-sm text-slate-400">@{account.username}</div>
                <div className="text-xs text-slate-500">
                  Status: {account.accountStatus}
                </div>
              </div>
              <button
                onClick={() => void toggleStatus(account)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  account.accountStatus === "Active"
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                }`}
              >
                {account.accountStatus === "Active" ? "Block" : "Unblock"}
              </button>
            </div>
          ))}

          {!loading && filteredAccounts.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              No guard accounts found.
            </div>
          ) : null}
        </div>
      </section>
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
      <div className="mb-2 text-sm text-slate-300">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
      />
    </label>
  );
}
