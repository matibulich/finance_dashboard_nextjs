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

function timeElapsed(purchaseDate: string): string {
  const now = new Date();
  const purchase = new Date(purchaseDate);
  const diffMs = now.getTime() - purchase.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return `${days} días`;
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
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">No tenés activos en tu cartera.</p>
        <p className="mt-1 text-sm text-gray-400">Agregá tu primer activo usando el botón de arriba.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left font-medium text-gray-500">Símbolo</th>
            <th className="px-3 py-3 text-left font-medium text-gray-500">Nombre</th>
            <th className="px-3 py-3 text-left font-medium text-gray-500">Tipo</th>
            <th className="px-3 py-3 text-right font-medium text-gray-500">Cantidad</th>
            <th className="px-3 py-3 text-right font-medium text-gray-500">P. Compra (ARS)</th>
            <th className="px-3 py-3 text-right font-medium text-gray-500">P. Actual (ARS)</th>
            <th className="px-3 py-3 text-right font-medium text-gray-500">Equivalente USD</th>
            <th className="px-3 py-3 text-right font-medium text-gray-500">Total (ARS)</th>
            <th className="px-3 py-3 text-right font-medium text-gray-500">Total (USD)</th>
            <th className="px-3 py-3 text-center font-medium text-gray-500">Tiempo</th>
            <th className="px-3 py-3 text-right font-medium text-gray-500">P&L (ARS)</th>
            <th className="px-3 py-3 text-right font-medium text-gray-500">P&L (USD)</th>
            <th className="px-3 py-3 text-right font-medium text-gray-500">%</th>
            <th className="px-3 py-3 text-center font-medium text-gray-500">Fecha</th>
            <th className="px-3 py-3 text-right font-medium text-gray-500">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {assets.map((asset) => {
            const pnlColor = asset.pnlUSD >= 0 ? "text-green-600" : "text-red-600";
            const percentColor = asset.pnlPercentARS >= 0 ? "text-green-600" : "text-red-600";
            return (
              <tr key={asset.id} className="hover:bg-gray-50">
                <td className="px-3 py-3 font-medium text-gray-900">{asset.symbol}</td>
                <td className="px-3 py-3 text-gray-700 max-w-[120px] truncate">{asset.name}</td>
                <td className="px-3 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    asset.type === "CRYPTO" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {asset.type === "CRYPTO" ? "Cripto" : "CEDEAR"}
                  </span>
                </td>
                <td className="px-3 py-3 text-right text-gray-700">{formatQty(asset.quantity)}</td>
                <td className="px-3 py-3 text-right text-gray-700">
                  {asset.purchasePriceARS ? formatARS(asset.purchasePriceARS) : "-"}
                </td>
                <td className="px-3 py-3 text-right text-gray-700">
                  {asset.currentPriceARS ? formatARS(asset.currentPriceARS) : "-"}
                </td>
                <td className="px-3 py-3 text-right text-gray-700">{formatUSD(asset.currentPriceUSD)}</td>
                <td className="px-3 py-3 text-right text-gray-700">
                  {asset.currentPriceARS ? formatARS(asset.currentPriceARS * asset.quantity) : "-"}
                </td>
                <td className="px-3 py-3 text-right text-gray-700">
                  {formatUSD(asset.currentPriceUSD * asset.quantity)}
                </td>
                <td className="px-3 py-3 text-center text-gray-500 text-xs">
                  {timeElapsed(asset.purchaseDate)}
                </td>
                <td className={`px-3 py-3 text-right font-medium ${pnlColor}`}>{formatARS(asset.pnlARS)}</td>
                <td className={`px-3 py-3 text-right font-medium ${pnlColor}`}>{formatUSD(asset.pnlUSD)}</td>
                <td className={`px-3 py-3 text-right font-medium ${percentColor}`}>
                  {formatPercent(asset.pnlPercentARS)}
                </td>
                <td className="px-3 py-3 text-center text-gray-500 text-xs">{asset.purchaseDate}</td>
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onSell(asset)}
                      className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                    >
                      Vender
                    </button>
                    <button
                      onClick={() => onDelete(asset)}
                      className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
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
