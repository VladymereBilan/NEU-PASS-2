export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footerNote
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerNote?: React.ReactNode;
}) {
  return (
    <main
      className="relative flex min-h-screen flex-col bg-[#040f0a] text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(3, 15, 9, 0.82), rgba(3, 15, 9, 0.88)), url('/NEWERABG.jpg')",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed"
      }}
    >
      <div className="flex items-center justify-between px-6 py-5 text-[11px] font-semibold tracking-[0.2em] uppercase">
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono">Secure Portal · TLS 1.3</span>
        </div>
        <div className="text-gray-400">Admin Access Only</div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-[22px] border border-emerald-500/25 bg-[#0a1f14]/85 p-8 shadow-[0_25px_70px_rgba(0,0,0,0.55)] backdrop-blur-md">
            <div className="absolute inset-x-8 top-0 h-[3px] rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-950/60">
                <ShieldIcon className="h-7 w-7 text-emerald-400" />
              </div>
              <div className="text-[11px] font-bold tracking-[0.28em] text-emerald-400 uppercase">
                {eyebrow}
              </div>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">{title}</h1>
              <p className="mt-2 text-center text-sm text-gray-400">{subtitle}</p>
            </div>

            <div className="mt-7">{children}</div>

            {footerNote ? (
              <>
                <div className="mt-7 flex items-center gap-3 text-[10px] font-semibold tracking-[0.2em] text-gray-500 uppercase">
                  <div className="h-px flex-1 bg-emerald-500/20" />
                  Authorized Personnel
                  <div className="h-px flex-1 bg-emerald-500/20" />
                </div>
                <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
                  {footerNote}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pb-6 text-center text-xs text-gray-500">
        © 2026 New Era University · NEU PASS Admin Portal · All rights reserved
      </div>

      <button
        type="button"
        aria-label="Help"
        className="fixed bottom-5 right-5 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/30 bg-[#0a1f14]/90 text-emerald-400 shadow-lg backdrop-blur transition hover:bg-emerald-950"
      >
        ?
      </button>
    </main>
  );
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12l1.8 1.8L14.5 10" />
    </svg>
  );
}

export function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="8" r="3.2" />
      <path strokeLinecap="round" d="M5.5 20c1-3.6 4-5.6 6.5-5.6s5.5 2 6.5 5.6" />
    </svg>
  );
}

export function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="5" y="10.5" width="14" height="9" rx="2" />
      <path strokeLinecap="round" d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.9 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15.4 15.4 0 0 1-3.3 4.1M6.5 7.4C4 9.1 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.2 0 2.3-.2 3.3-.6"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 10a2.6 2.6 0 0 0 3.6 3.6" />
    </svg>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  icon,
  placeholder,
  showPassword,
  onTogglePassword
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-[11px] font-bold tracking-[0.14em] text-gray-400 uppercase">
        {label}
      </div>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400">
            {icon}
          </span>
        ) : null}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-xl border border-emerald-500/20 bg-[#04150c]/70 py-3.5 text-white outline-none transition placeholder:text-gray-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20 ${
            icon ? "pl-11" : "pl-4"
          } ${onTogglePassword ? "pr-12" : "pr-4"}`}
          placeholder={placeholder}
        />
        {onTogglePassword ? (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-emerald-500/10 hover:text-emerald-300"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
    </label>
  );
}
