"use client";

import { useState, useEffect } from "react";
import { AssetWithPrice } from "@/app/(backend)/types/portfolio";

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n);
}

function formatQty(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

function formatPercent(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function formatShortDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y.slice(2)}`;
}

function daysBetween(dateStr: string) {
  const now = new Date();
  const purchase = new Date(dateStr);
  return Math.floor((now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24));
}

function TimeElapsed({ purchaseDate }: { purchaseDate: string }) {
  const [elapsed, setElapsed] = useState("—");
  useEffect(() => {
    setElapsed(`${daysBetween(purchaseDate)} dias`);
  }, [purchaseDate]);
  return <>{elapsed}</>;
}

function annualizedReturn(pnlPercentARS: number, purchaseDate: string) {
  const days = daysBetween(purchaseDate);
  if (days <= 0) return "—";
  const totalReturn = pnlPercentARS / 100;
  const ann = (Math.pow(1 + totalReturn, 365 / days) - 1) * 100;
  const sign = ann >= 0 ? "+" : "";
  return `${sign}${ann.toFixed(2)}%`;
}

function annualizedColor(pnlPercentARS: number, purchaseDate: string) {
  const days = daysBetween(purchaseDate);
  if (days <= 0) return "";
  const ann = (Math.pow(1 + pnlPercentARS / 100, 365 / days) - 1) * 100;
  return ann >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
}

export function PositionsTable({
  assets,
  onSell,
  onDelete,
}: {
  assets: AssetWithPrice[];
  onSell: (asset: AssetWithPrice) => void;
  onDelete: (asset: AssetWithPrice) => void;
}) {
  if (assets.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No tenes activos en tu cartera.</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Agrega tu primer activo usando el boton de arriba.</p>
      </div>
    );
  }

  const sortedAssets = [...assets].sort((a, b) => b.pnlPercentARS - a.pnlPercentARS);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-white dark:bg-slate-900 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-slate-700">Simbolo</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Nombre</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Tipo</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Cantidad</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">P. Compra (ARS)</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">P. Actual (ARS)</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Var. Diaria</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Total (ARS)</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Total (USD)</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">P&L (ARS)</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">P&L (USD)</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">%</th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Tiempo</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Rent. Anual</th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Fecha</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {sortedAssets.map((asset, i) => {
            const pnlColor = asset.pnlUSD >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
            const percentColor = asset.pnlPercentARS >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
            const rowBg = i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/30" : "";
            return (
              <tr key={asset.id} className={`transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800/60 ${rowBg}`}>
                <td className={`sticky left-0 z-10 px-4 py-3 font-medium text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700 ${i % 2 === 1 ? "bg-slate-50 dark:bg-slate-800/30" : "bg-white dark:bg-slate-900"}`}>{asset.symbol}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[120px] truncate">{asset.name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    asset.type === "CRYPTO"
                      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800"
                      : "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800"
                  }`}>
                    {asset.type === "CRYPTO" ? "Cripto" : "CEDEAR"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{formatQty(asset.quantity)}</td>
                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                  {asset.purchasePriceARS ? formatARS(asset.purchasePriceARS) : "-"}
                </td>
                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                  {asset.currentPriceARS ? formatARS(asset.currentPriceARS) : "-"}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${asset.changePercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {formatPercent(asset.changePercent)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                  {asset.currentPriceARS ? formatARS(asset.currentPriceARS * asset.quantity) : "-"}
                </td>
                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                  {formatUSD(asset.currentPriceUSD * asset.quantity)}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${pnlColor}`}>{formatARS(asset.pnlARS)}</td>
                <td className={`px-4 py-3 text-right font-medium ${pnlColor}`}>{formatUSD(asset.pnlUSD)}</td>
                <td className={`px-4 py-3 text-right font-medium ${percentColor}`}>
                  {formatPercent(asset.pnlPercentARS)}
                </td>
                <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 text-xs">
                  <TimeElapsed purchaseDate={asset.purchaseDate} />
                </td>
                <td suppressHydrationWarning className={`px-4 py-3 text-right font-medium text-xs ${annualizedColor(asset.pnlPercentARS, asset.purchaseDate)}`}>
                  {annualizedReturn(asset.pnlPercentARS, asset.purchaseDate)}
                </td>
                <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 text-xs">{formatShortDate(asset.purchaseDate)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => onSell(asset)}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Vender
                    </button>
                    <button
                      onClick={() => onDelete(asset)}
                      className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors duration-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
