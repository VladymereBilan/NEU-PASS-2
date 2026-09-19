const STEP_LABELS = ["Consent", "ID Photo", "Details", "Face Photo"];

export function VisitShell({
  step,
  title,
  subtitle,
  children
}: {
  step: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
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
      <div className="flex items-center justify-center px-6 py-5 text-[11px] font-semibold tracking-[0.2em] text-emerald-400 uppercase">
        New Era University · Visitor Registration
      </div>

      <div className="flex flex-1 items-start justify-center px-4 pb-16 pt-4">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-[22px] border border-emerald-500/25 bg-[#0a1f14]/85 p-8 shadow-[0_25px_70px_rgba(0,0,0,0.55)] backdrop-blur-md">
            <div className="absolute inset-x-8 top-0 h-[3px] rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

            <StepIndicator step={step} />

            <div className="mt-5">
              <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
              <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
            </div>

            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>

      <div className="pb-6 text-center text-xs text-gray-500">
        © 2026 New Era University · NEU PASS · All rights reserved
      </div>
    </main>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEP_LABELS.map((label, index) => {
        const stepNumber = index + 1;
        const isDone = stepNumber < step;
        const isCurrent = stepNumber === step;
        return (
          <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`h-1.5 w-full rounded-full ${
                isDone || isCurrent ? "bg-emerald-400" : "bg-emerald-500/15"
              }`}
            />
            <span
              className={`text-center text-[9px] font-bold tracking-[0.08em] uppercase ${
                isCurrent ? "text-emerald-300" : "text-gray-500"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-bold tracking-[0.14em] text-gray-400 uppercase">
      {children}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-emerald-500/20 bg-[#04150c]/70 px-4 py-3.5 text-white outline-none transition placeholder:text-gray-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20"
      />
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-300">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs font-medium text-emerald-400">{hint}</p>
      ) : null}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  hint,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  error?: string;
  hint?: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-emerald-500/20 bg-[#04150c]/70 px-4 py-3.5 text-white outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20"
      >
        <option value="" disabled className="text-gray-500">
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#0a1f14] text-white">
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-300">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs font-medium text-emerald-400">{hint}</p>
      ) : null}
    </label>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button"
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl bg-emerald-500 px-4 py-3.5 text-base font-bold text-[#04150c] shadow-[0_10px_30px_rgba(16,185,129,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl border border-emerald-500/20 bg-white/5 px-4 py-3.5 text-base font-bold text-white transition hover:border-emerald-400 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {children}
    </button>
  );
}

export function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
      {children}
    </p>
  );
}
