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
  const pnlColor = summary.totalPnLUSD >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <SummaryCard title="Saldo Total (ARS)" value={formatARS(summary.totalBalanceARS)} className="text-blue-600" />
      <SummaryCard title="Saldo Total (USD)" value={formatUSD(summary.totalBalanceUSD)} className="text-blue-600" />
      <SummaryCard title="P&L (ARS)" value={formatARS(summary.totalPnLARS)} className={pnlColor} />
      <SummaryCard title="P&L (USD)" value={formatUSD(summary.totalPnLUSD)} className={pnlColor} />
      {mep && (
        <SummaryCard
          title="Dólar MEP"
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
}: {
  title: string;
  value: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-1 text-lg font-semibold ${className ?? "text-gray-900"}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}
