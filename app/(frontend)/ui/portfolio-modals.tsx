"use client";

import { useActionState, useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/app/(frontend)/ui/components/button";
import {
  addAsset,
  sellAsset,
  updateLiquidity,
  clearLiquidity,
} from "@/app/(backend)/actions/portfolio";
import { PortfolioActionState, SearchResult } from "@/app/(backend)/types/portfolio";
import { showToast } from "@/app/(frontend)/ui/toast";
import { AssetType } from "@prisma/client";

const initialState: PortfolioActionState = { success: false, message: "" };

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-100/10";

const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";
const hintClass = "mt-1 text-xs text-slate-400 dark:text-slate-500";
const errorClass = "text-sm text-red-600 dark:text-red-400";
const modalOverlay = "fixed inset-0 z-40 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm dark:bg-black/50";
const modalCard = "relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900";
const modalCardSm = "relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900";
const closeBtn = "absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300";

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
        className={inputClass}
      />
      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          {loading && (
            <li className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">Buscando...</li>
          )}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">Sin resultados</li>
          )}
          {results.map((r, i) => (
            <li
              key={r.symbol}
              onMouseDown={() => handleSelect(r)}
              className={`cursor-pointer px-3 py-2 text-sm transition-colors duration-150 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700 ${
                i === selectedIndex ? "bg-slate-50 dark:bg-slate-700" : ""
              }`}
            >
              <span className="font-medium text-slate-900 dark:text-slate-100">{r.symbol}</span>
              <span className="ml-2 text-slate-500 dark:text-slate-400">{r.name}</span>
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
    <div className={modalOverlay}>
      <div className={modalCard}>
        <button onClick={onClose} className={closeBtn}>
          <X className="h-4 w-4" />
        </button>
        <div className="mb-5 pr-8">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Agregar Activo</h2>
        </div>
        <form action={action} className="space-y-4">
          <div>
            <label className={labelClass}>Tipo</label>
            <select
              name="type"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as AssetType)}
              className={inputClass}
            >
              <option value="CRYPTO">Criptomoneda</option>
              <option value="STOCK">CEDEAR / Accion</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Simbolo</label>
            <SymbolAutocomplete type={assetType} onSelect={handleSelect} />
            <input type="hidden" name="symbol" value={symbol} />
          </div>
          <div>
            <label className={labelClass}>Nombre</label>
            <input
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bitcoin / Eli Lilly CEDEAR"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Cantidad</label>
              <input
                name="quantity"
                type="number"
                required
                step="any"
                min="0.00000001"
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                {assetType === "CRYPTO" ? "Precio USD" : "Precio (ARS)"}
              </label>
              <input
                name="price"
                type="number"
                required
                step="any"
                min="0.0001"
                placeholder="0.00"
                className={inputClass}
              />
              {assetType === "STOCK" && (
                <p className={hintClass}>Precio del CEDEAR en pesos</p>
              )}
            </div>
          </div>
          <div>
            <label className={labelClass}>Fecha de compra</label>
            <input
              name="purchaseDate"
              type="date"
              defaultValue={today}
              max={today}
              className={inputClass}
            />
          </div>
          {assetType === "STOCK" && (
            <div>
              <label className={labelClass}>Dolar MEP (compra)</label>
              <input
                name="mepCompra"
                type="number"
                step="any"
                min="0"
                placeholder="API auto"
                className={inputClass}
              />
              <p className={hintClass}>Opcional. Si se vacia, usa el de la API</p>
            </div>
          )}
          {state.message && !state.success && (
            <p className={errorClass}>{state.message}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
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
    <div className={modalOverlay}>
      <div className={modalCardSm}>
        <button onClick={onClose} className={closeBtn}>
          <X className="h-4 w-4" />
        </button>
        <div className="mb-5 pr-8">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Vender {asset.symbol}</h2>
        </div>
        <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">
          Tenes <strong className="text-slate-900 dark:text-slate-100">{asset.quantity}</strong> unidades. Ingresa la cantidad y el precio de venta.
        </p>
        <form action={action} className="space-y-4">
          <div>
            <label className={labelClass}>Cantidad a vender</label>
            <input
              name="quantity"
              type="number"
              required
              step="any"
              min="0.00000001"
              max={asset.quantity}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Precio de venta (ARS)</label>
            <input
              name="sellPriceARS"
              type="number"
              required
              step="any"
              min="0.0001"
              defaultValue={asset.currentPriceARS ?? asset.purchasePriceARS ?? ""}
              placeholder="0.00"
              className={inputClass}
            />
            {asset.purchasePriceARS && (
              <p className={hintClass}>
                P. compra: ${asset.purchasePriceARS.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
          {state.message && !state.success && (
            <p className={errorClass}>{state.message}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} variant="destructive">
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
    <div className={modalOverlay}>
      <div className={modalCardSm}>
        <div className="mb-5 pr-8">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Eliminar {asset.symbol}</h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Estas seguro de eliminar {asset.symbol} de tu cartera? Esta accion no se puede deshacer.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
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
    <div className={modalOverlay}>
      <div className={modalCardSm}>
        <button onClick={onClose} className={closeBtn}>
          <X className="h-4 w-4" />
        </button>
        <div className="mb-5 pr-8">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Liquidez (ARS)</h2>
        </div>
        <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">
          Dinero no invertido disponible en pesos. El monto se suma a la liquidez actual ({currentLiquidity.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}).
        </p>
        <form action={action} className="space-y-4">
          <div>
            <label className={labelClass}>Monto a agregar (ARS)</label>
            <input
              name="amount"
              type="number"
              required
              step="0.01"
              min="0"
              defaultValue={0}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          {state.message && !state.success && (
            <p className={errorClass}>{state.message}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
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
