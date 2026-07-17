"use client";

import { useActionState, useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/app/(frontend)/ui/components/button";
import {
  addAsset,
  removeAsset,
  sellAsset,
  updateLiquidity,
  clearLiquidity,
} from "@/app/(backend)/actions/portfolio";
import { PortfolioActionState, SearchResult } from "@/app/(backend)/types/portfolio";
import { showToast } from "@/app/(frontend)/ui/toast";
import { AssetType } from "@prisma/client";

const initialState: PortfolioActionState = { success: false, message: "" };

function SymbolAutocomplete({
  type,
  onSelect,
}: {
  type: AssetType;
  onSelect: (result: SearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${type}`);
      const data: SearchResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
      setSelectedIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  function handleSelect(result: SearchResult) {
    onSelect(result);
    setQuery("");
    setOpen(false);
    setResults([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={type === "CRYPTO" ? "BTC, ETH, SOL..." : "AAPL, LLY.BA, KO.BA..."}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg"
        >
          {loading && (
            <li className="px-3 py-2 text-sm text-gray-400">Buscando...</li>
          )}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">Sin resultados</li>
          )}
          {results.map((r, i) => (
            <li
              key={r.symbol}
              onMouseDown={() => handleSelect(r)}
              className={`cursor-pointer px-3 py-2 text-sm hover:bg-blue-50 ${
                i === selectedIndex ? "bg-blue-50" : ""
              }`}
            >
              <span className="font-medium text-gray-900">{r.symbol}</span>
              <span className="ml-2 text-gray-500">{r.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AddAssetModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [assetType, setAssetType] = useState<AssetType>(AssetType.CRYPTO);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [state, action, pending] = useActionState(
    async (prev: PortfolioActionState, formData: FormData) => {
      formData.set("symbol", symbol);
      formData.set("name", name);
      const result = await addAsset(prev, formData);
      if (result.success) {
        showToast(result.message, "success");
        setSymbol("");
        setName("");
        onSuccess();
        onClose();
      } else {
        showToast(result.message, "error");
      }
      return result;
    },
    initialState
  );

  function handleSelect(result: SearchResult) {
    setSymbol(result.symbol);
    setName(result.name);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Agregar Activo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <form action={action} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo</label>
            <select
              name="type"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as AssetType)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="CRYPTO">Criptomoneda</option>
              <option value="STOCK">CEDEAR / Acción</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Símbolo</label>
            <SymbolAutocomplete type={assetType} onSelect={handleSelect} />
            <input type="hidden" name="symbol" value={symbol} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bitcoin / Eli Lilly CEDEAR"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Cantidad</label>
              <input
                name="quantity"
                type="number"
                required
                step="any"
                min="0.00000001"
                placeholder="0.00"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {assetType === "CRYPTO" ? "Precio USD" : "Precio (ARS)"}
              </label>
              <input
                name="price"
                type="number"
                required
                step="any"
                min="0.0001"
                placeholder="0.00"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {assetType === "STOCK" && (
                <p className="mt-1 text-xs text-gray-400">Precio del CEDEAR en pesos</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha de compra</label>
            <input
              name="purchaseDate"
              type="date"
              defaultValue={today}
              max={today}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {assetType === "STOCK" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Dólar MEP (compra)</label>
              <input
                name="mepCompra"
                type="number"
                step="any"
                min="0"
                placeholder="API auto"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">Opcional. Si se vacía, usa el de la API</p>
            </div>
          )}
          {state.message && !state.success && (
            <p className="text-sm text-red-500">{state.message}</p>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Agregando..." : "Agregar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SellAssetModal({
  open,
  onClose,
  asset,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  asset: { id: string; symbol: string; name: string; quantity: number; currentPriceARS: number | null; purchasePriceARS: number | null };
  onSuccess: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: PortfolioActionState, formData: FormData) => {
      formData.set("assetId", asset.id);
      const result = await sellAsset(prev, formData);
      if (result.success) {
        showToast(result.message, "success");
        onSuccess();
        onClose();
      } else {
        showToast(result.message, "error");
      }
      return result;
    },
    initialState
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Vender {asset.symbol}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          Tenés <strong>{asset.quantity}</strong> unidades. Ingresá la cantidad y el precio de venta.
        </p>
        <form action={action} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cantidad a vender</label>
            <input
              name="quantity"
              type="number"
              required
              step="any"
              min="0.00000001"
              max={asset.quantity}
              placeholder="0.00"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Precio de venta (ARS)</label>
            <input
              name="sellPriceARS"
              type="number"
              required
              step="any"
              min="0.0001"
              defaultValue={asset.currentPriceARS ?? asset.purchasePriceARS ?? ""}
              placeholder="0.00"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {asset.purchasePriceARS && (
              <p className="mt-1 text-xs text-gray-400">
                P. compra: ${asset.purchasePriceARS.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
          {state.message && !state.success && (
            <p className="text-sm text-red-500">{state.message}</p>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="bg-red-600 text-white hover:bg-red-700">
              {pending ? "Vendiendo..." : "Vender"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DeleteConfirmModal({
  open,
  onClose,
  asset,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  asset: { id: string; symbol: string };
  onConfirm: (assetId: string) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Eliminar {asset.symbol}</h2>
        <p className="mt-2 text-sm text-gray-600">
          ¿Estás seguro de eliminar {asset.symbol} de tu cartera? Esta acción no se puede deshacer.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => onConfirm(asset.id)}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LiquidityModal({
  open,
  onClose,
  currentLiquidity,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  currentLiquidity: number;
  onSuccess: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: PortfolioActionState, formData: FormData) => {
      const result = await updateLiquidity(prev, formData);
      if (result.success) {
        showToast(result.message, "success");
        onSuccess();
        onClose();
      } else {
        showToast(result.message, "error");
      }
      return result;
    },
    initialState
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Liquidez (ARS)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          Dinero no invertido disponible en pesos. Se suma al saldo total de la cuenta.
        </p>
        <form action={action} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Monto en ARS</label>
            <input
              name="amount"
              type="number"
              required
              step="0.01"
              min="0"
              defaultValue={currentLiquidity}
              placeholder="0.00"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {state.message && !state.success && (
            <p className="text-sm text-red-500">{state.message}</p>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={async () => {
              const result = await clearLiquidity();
              if (result.success) {
                showToast(result.message, "success");
                onSuccess();
                onClose();
              } else {
                showToast(result.message, "error");
              }
            }}>
              Borrar
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
