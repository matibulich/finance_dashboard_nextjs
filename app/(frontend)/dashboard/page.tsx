import { getPortfolio } from "@/app/(backend)/actions/portfolio";
import DashboardContent from "@/app/(frontend)/ui/dashboard-content";
import { Toast } from "@/app/(frontend)/ui/toast";

export default async function DashboardPage() {
  const { assets, summary, mep, pnlHistory, totalHistoricallyInvestedARS, pnlResetDate } = await getPortfolio();

  return (
    <section className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardContent
          initialAssets={assets}
          initialSummary={summary}
          initialMep={mep}
          initialPnlHistory={pnlHistory}
          initialTotalHistoricallyInvestedARS={totalHistoricallyInvestedARS}
          initialPnlResetDate={pnlResetDate}
        />
      </div>
      <Toast />
    </section>
  );
}
