import { PortfolioSummary, MEPRate } from "@/app/(backend)/types/portfolio";

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n);
}

export function DashboardSummary({
  summary,
  mep,
}: {
  summary: PortfolioSummary;
  mep: MEPRate | null;
}) {
  const pnlColor = summary.totalPnLUSD >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <SummaryCard title="Saldo Total (ARS)" value={formatARS(summary.totalBalanceARS)} accent />
      <SummaryCard title="Saldo Total (USD)" value={formatUSD(summary.totalBalanceUSD)} accent />
      <SummaryCard title="Liquidez (ARS)" value={formatARS(summary.liquidityARS)} accent />
      <SummaryCard title="P&L (ARS)" value={formatARS(summary.totalPnLARS)} className={pnlColor} />
      <SummaryCard title="P&L (USD)" value={formatUSD(summary.totalPnLUSD)} className={pnlColor} />
      {mep && (
        <SummaryCard
          title="Dolar MEP"
          value={`$${mep.venta.toLocaleString("es-AR")}`}
          subtitle={`Compra: $${mep.compra.toLocaleString("es-AR")}`}
        />
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  className,
  accent,
}: {
  title: string;
  value: string;
  subtitle?: string;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 ease-out hover:shadow-md dark:bg-slate-900 ${
      accent ? "border-slate-900/10 dark:border-slate-100/10" : "border-slate-200 dark:border-slate-700"
    }`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{title}</p>
      <p className={`mt-1.5 text-lg font-semibold tracking-tight ${className ?? "text-slate-900 dark:text-slate-100"}`}>{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
    </div>
  );
}
