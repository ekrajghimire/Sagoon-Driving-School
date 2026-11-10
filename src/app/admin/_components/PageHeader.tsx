export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="h2">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Kpi({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "warn" | "ok" | "bad" }) {
  const c = tone === "warn" ? "text-amber-700" : tone === "bad" ? "text-danger" : tone === "ok" ? "text-ok" : "text-ink";
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${c}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
