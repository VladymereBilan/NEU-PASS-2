export function Panel({
  title,
  eyebrow,
  action,
  children
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-emerald-500/20 bg-[#0a1f14]/80 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          {eyebrow ? (
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-emerald-500/15 bg-white/5 p-4">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-sm text-gray-400">{label}</div>
    </div>
  );
}

export function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-emerald-500/15 bg-white/5 px-4 py-3">
      <span className="text-gray-300">{label}</span>
      <span className="font-bold text-white">{value}</span>
    </div>
  );
}
