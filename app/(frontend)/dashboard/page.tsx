import { getPortfolio } from "@/app/(backend)/actions/portfolio";
import DashboardContent from "@/app/(frontend)/ui/dashboard-content";
import { Toast } from "@/app/(frontend)/ui/toast";

export default async function DashboardPage() {
  const { assets, summary, mep, pnlHistory, totalHistoricallyInvestedARS, pnlResetDate } = await getPortfolio();

  return (
    <section className="p-6">
      <DashboardContent
        initialAssets={assets}
        initialSummary={summary}
        initialMep={mep}
        initialPnlHistory={pnlHistory}
        initialTotalHistoricallyInvestedARS={totalHistoricallyInvestedARS}
        initialPnlResetDate={pnlResetDate}
      />
      <Toast />
    </section>
  );
}
