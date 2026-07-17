"use client";

import { useState, useCallback } from "react";
import { AssetWithPrice, PortfolioSummary, MEPRate, PortfolioActionState, PnLHistoryEntry } from "@/app/(backend)/types/portfolio";
import { getPortfolio, setCustomMEP, resetHistoricallyInvested } from "@/app/(backend)/actions/portfolio";
import { logoutUser } from "@/app/(backend)/actions/auth";
import { DashboardSummary } from "@/app/(frontend)/ui/dashboard-summary";
import { PositionsTable } from "@/app/(frontend)/ui/positions-table";
import { AddAssetModal, SellAssetModal, DeleteConfirmModal, LiquidityModal } from "@/app/(frontend)/ui/portfolio-modals";
import { Button } from "@/app/(frontend)/ui/components/button";
import { showToast } from "@/app/(frontend)/ui/toast";

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n);
}

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function formatPercent(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-3 items-center">
          <Button variant="outline" onClick={() => setShowLiquidityModal(true)}>
            Liquidez
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">MEP:</span>
            <input
              type="number"
              value={mepInput}
              placeholder="Auto"
              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              onChange={(e) => setMepInput(e.target.value)}
              onBlur={(e) => handleSetMEP(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={refresh} disabled={loading}>
            {loading ? "Actualizando..." : "Refrescar Precios"}
          </Button>
          <Button onClick={() => setShowAddModal(true)}>+ Agregar Activo</Button>
          <Button variant="outline" onClick={() => logoutUser()}>Log Out</Button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "resumen" && (
        <>
          <DashboardSummary summary={summary} mep={mep} />

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <div>
                <span className="text-gray-500">Invertido históricamente: </span>
                <span className="font-medium text-gray-900">{formatARS(totalHistoricallyInvestedARS)}</span>
              </div>
              <div>
                <span className="text-gray-500">P&L vendidos {pnlDateLabel}: </span>
                <span className={`font-medium ${cumulativePnL >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatARS(cumulativePnL)}
                </span>
                {pnlReturnPercent !== null && (
                  <span className={`ml-2 text-xs ${pnlReturnPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ({pnlReturnPercent >= 0 ? "+" : ""}{pnlReturnPercent.toFixed(2)}%)
                  </span>
                )}
              </div>
              <div>
                <span className="text-gray-500">P&L total (vendidos + cartera): </span>
                <span className={`font-medium ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatARS(totalPnL)}
                </span>
                {totalPnLReturnPercent !== null && (
                  <span className={`ml-2 text-xs ${totalPnLReturnPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ({totalPnLReturnPercent >= 0 ? "+" : ""}{totalPnLReturnPercent.toFixed(2)}%)
                  </span>
                )}
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
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Historial de Operaciones</h2>
              <p className="mt-1 text-sm text-gray-500">
                P&L vendidos {pnlDateLabel}: <span className={cumulativePnL >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  {formatARS(cumulativePnL)}
                </span>
                {pnlReturnPercent !== null && (
                  <span className={`ml-2 text-xs ${pnlReturnPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ({pnlReturnPercent >= 0 ? "+" : ""}{pnlReturnPercent.toFixed(2)}%)
                  </span>
                )}
                <span className="ml-4 text-gray-400">|</span>
                <span className="ml-4">P&L total: </span>
                <span className={totalPnL >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  {formatARS(totalPnL)}
                </span>
                {totalPnLReturnPercent !== null && (
                  <span className={`ml-1 text-xs ${totalPnLReturnPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ({totalPnLReturnPercent >= 0 ? "+" : ""}{totalPnLReturnPercent.toFixed(2)}%)
                  </span>
                )}
              </p>
            </div>
            <Button variant="outline" onClick={handleResetInvested} className="text-xs">
              Resetear invertido histórico
            </Button>
          </div>

          {pnlHistory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No hay operaciones de venta registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium text-gray-500">Fecha</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500">Símbolo</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500">Tipo</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">Cant.</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">P. Compra (ARS)</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">P. Venta (ARS)</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">P&L (ARS)</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">P&L (USD)</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-500">% P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pnlHistory.map((h) => {
                    const pnlColor = h.pnlARS >= 0 ? "text-green-600" : "text-red-600";
                    return (
                      <tr key={h.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-gray-700 text-xs">{new Date(h.soldAt).toLocaleDateString("es-AR")}</td>
                        <td className="px-3 py-3 font-medium text-gray-900">{h.symbol}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            h.assetType === "CRYPTO" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {h.assetType === "CRYPTO" ? "Cripto" : "CEDEAR"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-gray-700">{h.quantitySold}</td>
                        <td className="px-3 py-3 text-right text-gray-700">{formatARS(h.buyPriceARS)}</td>
                        <td className="px-3 py-3 text-right text-gray-700">{formatARS(h.sellPriceARS)}</td>
                        <td className={`px-3 py-3 text-right font-medium ${pnlColor}`}>{formatARS(h.pnlARS)}</td>
                        <td className={`px-3 py-3 text-right font-medium ${pnlColor}`}>{formatUSD(h.pnlUSD)}</td>
                        <td className={`px-3 py-3 text-right font-medium ${pnlColor}`}>
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
