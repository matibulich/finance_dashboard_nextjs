"use client";

import { useState, useCallback } from "react";
import { AssetWithPrice, PortfolioSummary, MEPRate, PnLHistoryEntry } from "@/app/(backend)/types/portfolio";
import { getPortfolio, setCustomMEP, resetHistoricallyInvested } from "@/app/(backend)/actions/portfolio";
import { logoutUser } from "@/app/(backend)/actions/auth";
import { DashboardSummary } from "@/app/(frontend)/ui/dashboard-summary";
import { PositionsTable } from "@/app/(frontend)/ui/positions-table";
import { AddAssetModal, SellAssetModal, DeleteConfirmModal, LiquidityModal } from "@/app/(frontend)/ui/portfolio-modals";
import { Button } from "@/app/(frontend)/ui/components/button";
import { showToast } from "@/app/(frontend)/ui/toast";
import { ThemeToggle } from "@/app/(frontend)/ui/theme-toggle";

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n);
}

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

export default function DashboardContent({
  initialAssets,
  initialSummary,
  initialMep,
  initialPnlHistory,
  initialTotalHistoricallyInvestedARS,
  initialPnlResetDate,
}: {
  initialAssets: AssetWithPrice[];
  initialSummary: PortfolioSummary;
  initialMep: MEPRate | null;
  initialPnlHistory: PnLHistoryEntry[];
  initialTotalHistoricallyInvestedARS: number;
  initialPnlResetDate: string | null;
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [summary, setSummary] = useState(initialSummary);
  const [mep, setMep] = useState(initialMep);
  const [pnlHistory, setPnlHistory] = useState(initialPnlHistory);
  const [totalHistoricallyInvestedARS, setTotalHistoricallyInvestedARS] = useState(initialTotalHistoricallyInvestedARS);
  const [pnlResetDate, setPnlResetDate] = useState<string | null>(initialPnlResetDate);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLiquidityModal, setShowLiquidityModal] = useState(false);
  const [sellTarget, setSellTarget] = useState<AssetWithPrice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssetWithPrice | null>(null);
  const [mepInput, setMepInput] = useState<string>(initialMep?.venta?.toString() ?? "");
  const [activeTab, setActiveTab] = useState<"resumen" | "historial">("resumen");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPortfolio();
      setAssets(data.assets);
      setSummary(data.summary);
      setMep(data.mep);
      setPnlHistory(data.pnlHistory);
      setTotalHistoricallyInvestedARS(data.totalHistoricallyInvestedARS);
      setPnlResetDate(data.pnlResetDate);
    } catch {
      showToast("Error al actualizar datos", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async (assetId: string) => {
    const formData = new FormData();
    formData.set("assetId", assetId);
    formData.set("quantity", "999999999");
    try {
      const { removeAsset } = await import("@/app/(backend)/actions/portfolio");
      const result = await removeAsset({ success: true, message: "" }, formData);
      if (result.success) {
        showToast(result.message, "success");
        setDeleteTarget(null);
        refresh();
      } else {
        showToast(result.message, "error");
      }
    } catch {
      showToast("Error al eliminar activo", "error");
    }
  }, [refresh]);

  const handleSetMEP = useCallback(async (value: string) => {
    const formData = new FormData();
    formData.set("mep", value);
    try {
      const result = await setCustomMEP({ success: false, message: "" }, formData);
      if (result.success) {
        refresh();
      }
    } catch {
      showToast("Error al actualizar MEP", "error");
    }
  }, [refresh]);

  const handleResetInvested = useCallback(async () => {
    try {
      const result = await resetHistoricallyInvested();
      if (result.success) {
        showToast(result.message, "success");
        refresh();
      } else {
        showToast(result.message, "error");
      }
    } catch {
      showToast("Error al resetear", "error");
    }
  }, [refresh]);

  const cumulativePnL = pnlHistory.reduce((sum, h) => sum + h.pnlARS, 0);
  const totalPnL = cumulativePnL + summary.totalPnLARS;
  const pnlReturnPercent = totalHistoricallyInvestedARS > 0
    ? Math.round((cumulativePnL / totalHistoricallyInvestedARS) * 10000) / 100
    : null;
  const totalPnLReturnPercent = totalHistoricallyInvestedARS > 0
    ? Math.round((totalPnL / totalHistoricallyInvestedARS) * 10000) / 100
    : null;
  const pnlDateLabel = pnlResetDate
    ? `desde ${new Date(pnlResetDate).toLocaleDateString("es-AR")}`
    : "";

  const tabs = [
    { key: "resumen" as const, label: "Resumen" },
    { key: "historial" as const, label: "Historial" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => setShowLiquidityModal(true)}>
            Liquidez
          </Button>
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">MEP</span>
            <input
              type="number"
              value={mepInput}
              placeholder="Auto"
              className="w-20 rounded border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
              onChange={(e) => setMepInput(e.target.value)}
              onBlur={(e) => handleSetMEP(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? "Actualizando..." : "Refrescar"}
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            Agregar Activo
          </Button>
          <Button variant="ghost" size="sm" onClick={() => logoutUser()}>
            Salir
          </Button>
        </div>
      </div>

      <div className="flex gap-0 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 ease-out ${
              activeTab === tab.key
                ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "resumen" && (
        <>
          <DashboardSummary summary={summary} mep={mep} />

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-8 text-sm flex-wrap">
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Invertido historicamente</span>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">{formatARS(totalHistoricallyInvestedARS)}</p>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">P&L vendidos {pnlDateLabel}</span>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className={`font-semibold ${cumulativePnL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {formatARS(cumulativePnL)}
                  </span>
                  {pnlReturnPercent !== null && (
                    <span className={`text-xs font-medium ${pnlReturnPercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {pnlReturnPercent >= 0 ? "+" : ""}{pnlReturnPercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">P&L total (vendidos + cartera)</span>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className={`font-semibold ${totalPnL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {formatARS(totalPnL)}
                  </span>
                  {totalPnLReturnPercent !== null && (
                    <span className={`text-xs font-medium ${totalPnLReturnPercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {totalPnLReturnPercent >= 0 ? "+" : ""}{totalPnLReturnPercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <PositionsTable
            assets={assets}
            onSell={setSellTarget}
            onDelete={setDeleteTarget}
          />
        </>
      )}

      {activeTab === "historial" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Historial de Operaciones</h2>
              <div className="mt-1 flex items-center gap-3 text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  P&L vendidos {pnlDateLabel}:
                </span>
                <span className={`font-medium ${cumulativePnL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {formatARS(cumulativePnL)}
                </span>
                {pnlReturnPercent !== null && (
                  <span className={`text-xs font-medium ${pnlReturnPercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    ({pnlReturnPercent >= 0 ? "+" : ""}{pnlReturnPercent.toFixed(2)}%)
                  </span>
                )}
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="text-slate-500 dark:text-slate-400">P&L total:</span>
                <span className={`font-medium ${totalPnL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {formatARS(totalPnL)}
                </span>
                {totalPnLReturnPercent !== null && (
                  <span className={`text-xs font-medium ${totalPnLReturnPercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    ({totalPnLReturnPercent >= 0 ? "+" : ""}{totalPnLReturnPercent.toFixed(2)}%)
                  </span>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetInvested}>
              Resetear invertido
            </Button>
          </div>

          {pnlHistory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8 dark:text-slate-500">No hay operaciones de venta registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Simbolo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Cant.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">P. Compra (ARS)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">P. Venta (ARS)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">P&L (ARS)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">P&L (USD)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">% P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pnlHistory.map((h) => {
                    const pnlColor = h.pnlARS >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
                    return (
                      <tr key={h.id} className="transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-slate-500 text-xs dark:text-slate-400">{new Date(h.soldAt).toLocaleDateString("es-AR")}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{h.symbol}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            h.assetType === "CRYPTO"
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800"
                              : "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800"
                          }`}>
                            {h.assetType === "CRYPTO" ? "Cripto" : "CEDEAR"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{h.quantitySold}</td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{formatARS(h.buyPriceARS)}</td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{formatARS(h.sellPriceARS)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${pnlColor}`}>{formatARS(h.pnlARS)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${pnlColor}`}>{formatUSD(h.pnlUSD)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${pnlColor}`}>
                          {h.pnlPercent >= 0 ? "+" : ""}{h.pnlPercent.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <AddAssetModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refresh}
      />

      <LiquidityModal
        open={showLiquidityModal}
        onClose={() => setShowLiquidityModal(false)}
        currentLiquidity={summary.liquidityARS}
        onSuccess={refresh}
      />

      {sellTarget && (
        <SellAssetModal
          open={!!sellTarget}
          onClose={() => setSellTarget(null)}
          asset={{
            id: sellTarget.id,
            symbol: sellTarget.symbol,
            name: sellTarget.name,
            quantity: sellTarget.quantity,
            currentPriceARS: sellTarget.currentPriceARS,
            purchasePriceARS: sellTarget.purchasePriceARS,
          }}
          onSuccess={refresh}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          asset={{ id: deleteTarget.id, symbol: deleteTarget.symbol }}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
