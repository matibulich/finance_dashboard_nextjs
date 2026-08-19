"use server";

import prisma from "@/app/(backend)/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import {
  AssetWithPrice,
  PortfolioSummary,
  PortfolioActionState,
  MEPRate,
  PnLHistoryEntry,
  CapitalMovementEntry,
} from "@/app/(backend)/types/portfolio";
import { AssetType } from "@prisma/client";
import { getCedearRatio } from "@/app/(backend)/lib/cedears";

async function getUserIdFromToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

async function fetchDolarRates(): Promise<{ mep: MEPRate | null; ccl: MEPRate | null }> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares", {
      next: { revalidate: 120 },
    });
    if (!res.ok) return { mep: null, ccl: null };
    const data = await res.json();
    const mepData = data.find((d: { casa: string }) => d.casa === "bolsa");
    const cclData = data.find((d: { casa: string }) => d.casa === "contadoconliqui");
    return {
      mep: mepData ? { compra: mepData.compra, venta: mepData.venta, fechaActualizacion: mepData.fechaActualizacion } : null,
      ccl: cclData ? { compra: cclData.compra, venta: cclData.venta, fechaActualizacion: cclData.fechaActualizacion } : null,
    };
  } catch {
    return { mep: null, ccl: null };
  }
}

const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  ADA: "cardano",
  XRP: "ripple",
  DOGE: "dogecoin",
  DOT: "polkadot",
  MATIC: "matic-network",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  UNI: "uniswap",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  ATOM: "cosmos",
  XLM: "stellar",
  VET: "vechain",
  FIL: "filecoin",
  TRX: "tron",
  ETC: "ethereum-classic",
  THETA: "theta-token",
  AAVE: "aave",
  ALGO: "algorand",
  XTZ: "tezos",
  EOS: "eos",
  NEO: "neo",
  DASH: "dash",
  ZEC: "zcash",
  XMR: "monero",
  COMP: "compound-governance-token",
  MKR: "maker",
  SNX: "havven",
  YFI: "yearn-finance",
  SUSHI: "sushi",
  CRV: "curve-dao-token",
  "1INCH": "1inch",
  BAL: "balancer",
  REN: "republic-protocol",
  UMA: "uma",
  BAND: "band-protocol",
  OCEAN: "ocean-protocol",
  STORJ: "storj",
  BAT: "basic-attention-token",
  ZRX: "0x",
  ENJ: "enjincoin",
  MANA: "decentraland",
  SAND: "the-sandbox",
  AXS: "axie-infinity",
  CHZ: "chiliz",
  GRT: "the-graph",
  LRC: "loopring",
  ANKR: "ankr",
  HOT: "holotoken",
  NKN: "nkn",
  CELR: "celer-network",
  DENT: "dent",
  WIN: "wink",
  TFUEL: "theta-fuel",
  ONE: "harmony",
  HBAR: "hedera-hashgraph",
  MTL: "metal",
  OGN: "origin-protocol",
  DODO: "dodo",
  ALPHA: "alpha-finance",
  CTK: "certik",
  CTSI: "cartesi",
  SKL: "skale",
  REEF: "reef",
  BURGER: "burger-swap",
  BAKE: "bakerytoken",
  DEGO: "dego-finance",
  DYDX: "dydx-chain",
  INJ: "injective-protocol",
  PERP: "perpetual-protocol",
  RAY: "raydium",
  SRM: "serum",
  FTT: "ftx-token",
  SOLVE: "solve-care",
  WAVES: "waves",
  KSM: "kusama",
  ICP: "internet-computer",
  FLOW: "flow",
  NEAR: "near",
  EGLD: "elrond-erd-2",
  ROSE: "oasis-network",
  KLAY: "klay-token",
  CELO: "celo",
};

async function fetchCryptoPrices(symbols: string[]): Promise<Record<string, { price: number; percent_change_24h: number }>> {
  if (symbols.length === 0) return {};
  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) return {};
  try {
    const idMap: Record<string, string> = {};
    const unresolved: string[] = [];

    for (const sym of symbols) {
      const upper = sym.toUpperCase();
      const id = SYMBOL_TO_COINGECKO_ID[upper];
      if (id) {
        idMap[sym] = id;
      } else {
        unresolved.push(sym);
      }
    }

    if (unresolved.length > 0) {
      await Promise.all(
        unresolved.map(async (sym) => {
          const id = await resolveSymbolViaSearch(sym);
          if (id) idMap[sym] = id;
        })
      );
    }

    const ids = Object.values(idMap);
    if (ids.length === 0) return {};

    const url = new URL("https://api.coingecko.com/api/v3/simple/price");
    url.searchParams.set("ids", ids.join(","));
    url.searchParams.set("vs_currencies", "usd");
    url.searchParams.set("include_24hr_change", "true");

    const res = await fetch(url.toString(), {
      headers: { "x-cg-pro-api-key": apiKey, Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return {};
    const data = await res.json();

    const prices: Record<string, { price: number; percent_change_24h: number }> = {};
    for (const [sym, id] of Object.entries(idMap)) {
      const coinData = data[id];
      if (coinData) {
        prices[sym] = {
          price: coinData.usd,
          percent_change_24h: coinData.usd_24h_change ?? 0,
        };
      }
    }
    return prices;
  } catch {
    return {};
  }
}

async function resolveSymbolViaSearch(symbol: string): Promise<string | null> {
  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`,
      {
        headers: { "x-cg-pro-api-key": apiKey, Accept: "application/json" },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const coins = data.coins ?? [];
    const match = coins.find(
      (c: { symbol: string; id: string }) => c.symbol.toUpperCase() === symbol.toUpperCase()
    );
    return match?.id ?? null;
  } catch {
    return null;
  }
}

async function fetchStockPrices(symbols: string[]): Promise<{
  prices: Record<string, { priceUSD: number | null; priceARS: number | null; changePercent: number }>;
  fallbacks: Record<string, { priceUSD: number; changePercent: number }>;
}> {
  if (symbols.length === 0) return { prices: {}, fallbacks: {} };
  const prices: Record<string, { priceUSD: number | null; priceARS: number | null; changePercent: number }> = {};
  const fallbacks: Record<string, { priceUSD: number; changePercent: number }> = {};
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };

  async function fetchYahoo(symbol: string): Promise<{ priceUSD: number | null; priceARS: number | null; changePercent: number } | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
          { headers, next: { revalidate: 120 } }
        );
        if (res.ok) {
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (meta) {
            const yahooPrice = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose;
            const changePercent = prevClose && prevClose > 0 ? Math.round(((yahooPrice - prevClose) / prevClose) * 10000) / 100 : 0;
            if (symbol.endsWith(".BA")) {
              return { priceUSD: null, priceARS: yahooPrice, changePercent };
            }
            return { priceUSD: yahooPrice, priceARS: null, changePercent };
          }
          return null;
        }
        if (res.status === 429) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        return null;
      } catch {
        return null;
      }
    }
    return null;
  }

  const fetches = symbols.map(async (symbol) => {
    const result = await fetchYahoo(symbol);
    if (result) {
      prices[symbol] = result;
    } else if (symbol.endsWith(".BA")) {
      const baseSymbol = symbol.slice(0, -3);
      const baseResult = await fetchYahoo(baseSymbol);
      if (baseResult && baseResult.priceUSD !== null) {
        fallbacks[symbol] = { priceUSD: baseResult.priceUSD, changePercent: baseResult.changePercent };
      }
    }
  });
  await Promise.allSettled(fetches);

  return { prices, fallbacks };
}

export async function updateLiquidity(
  _prevState: PortfolioActionState,
  formData: FormData
): Promise<PortfolioActionState> {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return { success: false, message: "No autenticado" };

    const amount = parseFloat(formData.get("amount") as string);
    if (isNaN(amount) || amount < 0) {
      return { success: false, message: "El monto debe ser un número válido mayor o igual a 0" };
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { liquidityARS: true } });
    const currentLiquidity = Number(user?.liquidityARS ?? 0);

    await prisma.user.update({
      where: { id: userId },
      data: { liquidityARS: Math.round((currentLiquidity + amount) * 100) / 100 },
    });

    return { success: true, message: "Liquidez actualizada correctamente" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error al actualizar liquidez",
    };
  }
}

export async function clearLiquidity(): Promise<PortfolioActionState> {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return { success: false, message: "No autenticado" };

    await prisma.user.update({
      where: { id: userId },
      data: { liquidityARS: 0 },
    });

    return { success: true, message: "Liquidez borrada correctamente" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error al borrar liquidez",
    };
  }
}

export async function setCustomMEP(
  _prevState: PortfolioActionState,
  formData: FormData
): Promise<PortfolioActionState> {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return { success: false, message: "No autenticado" };

    const value = formData.get("mep") as string;
    const mep = value && value.trim() !== "" ? parseFloat(value) : null;

    if (mep !== null && (isNaN(mep) || mep <= 0)) {
      return { success: false, message: "Valor inválido" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { customMEP: mep },
    });

    return { success: true, message: mep ? "MEP actualizado" : "MEP reseteado a API" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error al actualizar MEP",
    };
  }
}

export async function addAsset(
  prevState: PortfolioActionState,
  formData: FormData
): Promise<PortfolioActionState> {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return { success: false, message: "No autenticado" };
    const type = formData.get("type") as AssetType;
    const symbol = (formData.get("symbol") as string).trim().toUpperCase();
    const name = formData.get("name") as string;
    const quantity = parseFloat(formData.get("quantity") as string);
    const price = parseFloat(formData.get("price") as string);
    const purchaseDateRaw = formData.get("purchaseDate") as string;
    const purchaseDate = purchaseDateRaw ? new Date(purchaseDateRaw) : new Date();

    if (!type || !symbol || !name || !quantity || !price) {
      return { success: false, message: "Todos los campos son requeridos" };
    }
    if (quantity <= 0 || price <= 0) {
      return { success: false, message: "Cantidad y precio deben ser mayores a 0" };
    }

    let storedPrice = price;
    let purchasePriceARSValue: number | null = null;

    const { mep: mepRate, ccl: cclRate } = await fetchDolarRates();

    if (type === AssetType.STOCK) {
      const baseSymbol = symbol.endsWith(".BA") ? symbol.slice(0, -3) : symbol;
      const ratio = getCedearRatio(baseSymbol);
      if (ratio) {
        const cclCompraRaw = formData.get("mepCompra") as string;
        let cclValue = cclCompraRaw ? parseFloat(cclCompraRaw) : null;
        if (!cclValue || cclValue <= 0) {
          cclValue = cclRate?.venta ?? null;
        }
        if (!cclValue || cclValue <= 0) {
          cclValue = mepRate?.venta ?? null;
        }
        if (!cclValue || cclValue <= 0) {
          return { success: false, message: "No se pudo obtener la cotización CCL ni MEP" };
        }
        storedPrice = price / cclValue;
        purchasePriceARSValue = Math.round(price * 100) / 100;
      }
    } else if (type === AssetType.CRYPTO) {
      if (mepRate) {
        purchasePriceARSValue = Math.round(price * mepRate.venta * 100) / 100;
      }
    }

    const existing = await prisma.asset.findUnique({
      where: { userId_symbol: { userId, symbol } },
    });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { liquidityARS: true } });
    const currentLiquidity = Number(user?.liquidityARS ?? 0);
    let costARS = 0;

    if (type === AssetType.STOCK) {
      const baseSymbol = symbol.endsWith(".BA") ? symbol.slice(0, -3) : symbol;
      const ratio = getCedearRatio(baseSymbol);
      if (ratio) {
        costARS = price * quantity;
      }
    } else {
      if (mepRate) {
        costARS = price * quantity * mepRate.venta;
      }
    }

    await prisma.$transaction(async (tx) => {
      if (existing) {
        const qtyActual = Number(existing.quantity);
        const pppAnterior = Number(existing.averagePrice);
        const qtyTotal = qtyActual + quantity;
        const nuevoPPP = (qtyActual * pppAnterior + quantity * storedPrice) / qtyTotal;

        const existingTotalARS = Number(existing.purchasePriceARS ?? 0) * qtyActual;
        const newTotalARS = (purchasePriceARSValue ?? 0) * quantity;
        const avgPurchaseARS = qtyTotal > 0 ? (existingTotalARS + newTotalARS) / qtyTotal : 0;

        await tx.asset.update({
          where: { id: existing.id },
          data: {
            quantity: qtyTotal,
            averagePrice: Math.round(nuevoPPP * 10000) / 10000,
            purchasePriceARS: Math.round(avgPurchaseARS * 100) / 100,
            name,
          },
        });
      } else {
        await tx.asset.create({
          data: {
            userId,
            symbol,
            name,
            type,
            quantity,
            averagePrice: Math.round(storedPrice * 10000) / 10000,
            purchasePriceARS: purchasePriceARSValue,
            purchaseDate,
          },
        });
      }

      const assetId = existing?.id ?? undefined;

      await tx.transaction.create({
        data: {
          userId,
          assetId,
          type: "ADD",
          symbol,
          quantity,
          price: storedPrice,
          total: quantity * storedPrice,
        },
      });

      if (costARS > 0 && currentLiquidity >= costARS) {
        await tx.user.update({
          where: { id: userId },
          data: {
            liquidityARS: Math.round((currentLiquidity - costARS) * 100) / 100,
          },
        });
      }
    });

    return { success: true, message: `${symbol} agregado correctamente` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error al agregar activo",
    };
  }
}

export async function removeAsset(
  prevState: PortfolioActionState,
  formData: FormData
): Promise<PortfolioActionState> {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return { success: false, message: "No autenticado" };
    const assetId = formData.get("assetId") as string;
    const quantityToRemove = parseFloat(formData.get("quantity") as string);

    if (!assetId || !quantityToRemove || quantityToRemove <= 0) {
      return { success: false, message: "Datos inválidos" };
    }

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, userId },
    });

    if (!asset) {
      return { success: false, message: "Activo no encontrado" };
    }

    const qtyActual = Number(asset.quantity);
    let deletedAsset = false;

    if (quantityToRemove >= qtyActual) {
      await prisma.asset.delete({ where: { id: assetId } });
      deletedAsset = true;
    } else {
      await prisma.asset.update({
        where: { id: assetId },
        data: { quantity: qtyActual - quantityToRemove },
      });
    }

    await prisma.transaction.create({
      data: {
        userId,
        assetId: deletedAsset ? null : assetId,
        type: "REMOVE",
        symbol: asset.symbol,
        quantity: quantityToRemove,
        price: Number(asset.averagePrice),
        total: quantityToRemove * Number(asset.averagePrice),
      },
    });

    return { success: true, message: `${asset.symbol} reducido correctamente` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error al eliminar activo",
    };
  }
}

export async function sellAsset(
  prevState: PortfolioActionState,
  formData: FormData
): Promise<PortfolioActionState> {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return { success: false, message: "No autenticado" };
    const assetId = formData.get("assetId") as string;
    const quantityToSell = parseFloat(formData.get("quantity") as string);
    const sellPriceARS = parseFloat(formData.get("sellPriceARS") as string);

    if (!assetId || !quantityToSell || quantityToSell <= 0) {
      return { success: false, message: "Datos inválidos" };
    }
    if (!sellPriceARS || sellPriceARS <= 0) {
      return { success: false, message: "El precio de venta debe ser mayor a 0" };
    }

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, userId },
    });
    if (!asset) {
      return { success: false, message: "Activo no encontrado" };
    }

    const qtyActual = Number(asset.quantity);
    if (quantityToSell > qtyActual) {
      return { success: false, message: "No podés vender más de lo que tenés" };
    }

    const buyPriceUSD = Number(asset.averagePrice);
    let buyPriceARS = asset.purchasePriceARS != null ? Number(asset.purchasePriceARS) : 0;
    if (buyPriceARS <= 0 && buyPriceUSD > 0) {
      if (asset.type === AssetType.STOCK) {
        const { ccl: cclRate } = await fetchDolarRates();
        const cclVenta = cclRate?.venta ?? 0;
        if (cclVenta > 0) {
          buyPriceARS = Math.round(buyPriceUSD * cclVenta * 100) / 100;
        }
      } else if (asset.type === AssetType.CRYPTO) {
        const { mep: mepRate } = await fetchDolarRates();
        const mepVenta = mepRate?.venta ?? 0;
        if (mepVenta > 0) {
          buyPriceARS = Math.round(buyPriceUSD * mepVenta * 100) / 100;
        }
      }
    }

    let sellPriceUSD = 0;
    if (asset.type === AssetType.CRYPTO) {
      sellPriceUSD = sellPriceARS;
    } else {
      const { ccl: cclRate } = await fetchDolarRates();
      const cclVenta = cclRate?.venta ?? 0;
      sellPriceUSD = cclVenta > 0 ? Math.round((sellPriceARS / cclVenta) * 100) / 100 : 0;
    }

    const pnlARS = Math.round((sellPriceARS - buyPriceARS) * quantityToSell * 100) / 100;
    const pnlUSD = Math.round((sellPriceUSD - buyPriceUSD) * quantityToSell * 100) / 100;

    const costOfSold = buyPriceARS * quantityToSell;
    const totalInvestedARS = Math.round(costOfSold * 100) / 100;

    const totalSellARS = Math.round(sellPriceARS * quantityToSell * 100) / 100;

    let deletedAsset = false;
    await prisma.$transaction(async (tx) => {
      if (quantityToSell >= qtyActual) {
        await tx.asset.delete({ where: { id: assetId } });
        deletedAsset = true;
      } else {
        await tx.asset.update({
          where: { id: assetId },
          data: { quantity: qtyActual - quantityToSell },
        });
      }

      await tx.pnLHistory.create({
        data: {
          userId,
          assetId: deletedAsset ? null : assetId,
          symbol: asset.symbol,
          name: asset.name,
          assetType: asset.type,
          quantitySold: quantityToSell,
          buyPriceUSD,
          buyPriceARS,
          sellPriceUSD,
          sellPriceARS,
          pnlARS,
          pnlUSD,
          totalInvestedARS,
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          assetId: deletedAsset ? null : assetId,
          type: "REMOVE",
          symbol: asset.symbol,
          quantity: quantityToSell,
          price: sellPriceUSD,
          total: quantityToSell * sellPriceUSD,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          liquidityARS: {
            increment: totalSellARS,
          },
        },
      });
    });

    return { success: true, message: `${asset.symbol} vendido correctamente` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error al vender activo",
    };
  }
}

function resolvePurchaseDate(
  h: { symbol: string; soldAt: Date; assetId?: string | null },
  transactions: { symbol: string; createdAt: Date; type: string }[],
  assets: { id?: string; symbol: string; purchaseDate?: Date | null }[]
): Date | null {
  if (h.assetId) {
    const matchedAsset = assets.find((a) => a.id === h.assetId);
    if (matchedAsset?.purchaseDate && matchedAsset.purchaseDate <= h.soldAt) {
      return matchedAsset.purchaseDate;
    }
  }

  const txsBeforeSale = transactions.filter(
    (t) => t.symbol === h.symbol && t.type === "ADD" && t.createdAt <= h.soldAt
  );
  if (txsBeforeSale.length > 0) {
    return txsBeforeSale[0].createdAt;
  }

  const symbolAsset = assets.find((a) => a.symbol === h.symbol);
  if (symbolAsset?.purchaseDate) {
    return symbolAsset.purchaseDate;
  }

  const anyTx = transactions.find((t) => t.symbol === h.symbol && t.type === "ADD");
  if (anyTx) {
    return anyTx.createdAt;
  }

  return null;
}

async function fetchSpyHistoricalPrices(
  minDate: Date,
  maxDate: Date
): Promise<{ timestamp: number; date: string; price: number }[]> {
  const period1 = Math.floor(minDate.getTime() / 1000) - 86400 * 7;
  const period2 = Math.floor(maxDate.getTime() / 1000) + 86400 * 3;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/SPY?period1=${period1}&period2=${period2}&interval=1d`,
        { headers, next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        const timestamps = result?.timestamp as number[] | undefined;
        const quotes = result?.indicators?.quote?.[0]?.close as (number | null)[] | undefined;
        const adjcloses = result?.indicators?.adjclose?.[0]?.adjclose as (number | null)[] | undefined;
        if (!timestamps || !quotes) return [];

        const dailyPrices: { timestamp: number; date: string; price: number }[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          const t = timestamps[i];
          const p = quotes[i] ?? adjcloses?.[i];
          if (t && p !== null && p !== undefined && !isNaN(p) && p > 0) {
            const dateStr = new Date(t * 1000).toISOString().split("T")[0];
            dailyPrices.push({ timestamp: t * 1000, date: dateStr, price: p });
          }
        }
        return dailyPrices;
      }
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      return [];
    } catch {
      return [];
    }
  }
  return [];
}

let cclHistoricalCache: Map<string, number> | null = null;

async function fetchAllCclHistorical(): Promise<Map<string, number>> {
  if (cclHistoricalCache) return cclHistoricalCache;

  try {
    const res = await fetch(
      "https://api.argentinadatos.com/v1/cotizaciones/dolares/contadoconliqui",
      { next: { revalidate: 86400 } }
    );
    if (res.ok) {
      const data = await res.json();
      const rates = new Map<string, number>();
      for (const item of data) {
        if (item.casa === "contadoconliqui" && item.fecha && item.venta) {
          // Normalize date to YYYY-MM-DD format
          let fecha = item.fecha;
          if (fecha.includes("/")) {
            // Convert DD/MM/YYYY to YYYY-MM-DD
            const parts = fecha.split("/");
            if (parts.length === 3) {
              fecha = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            }
          }
          rates.set(fecha, item.venta);
        }
      }
      cclHistoricalCache = rates;
      return rates;
    }
  } catch {
    // Fallback to empty map
  }
  cclHistoricalCache = new Map();
  return cclHistoricalCache;
}

async function fetchCclRatesForDates(
  dates: Date[]
): Promise<Map<string, number>> {
  const allRates = await fetchAllCclHistorical();
  const uniqueDates = Array.from(
    new Set(dates.map((d) => d.toISOString().split("T")[0]))
  );
  const rates = new Map<string, number>();

  const sortedRateDates = Array.from(allRates.keys()).sort();

  for (const dateStr of uniqueDates) {
    let rate = allRates.get(dateStr);
    if (rate !== undefined) {
      rates.set(dateStr, rate);
    } else if (sortedRateDates.length > 0) {
      // Find closest available date
      const targetTime = new Date(dateStr).getTime();
      let closest = sortedRateDates[0];
      let minDiff = Math.abs(new Date(sortedRateDates[0]).getTime() - targetTime);

      for (const d of sortedRateDates) {
        const diff = Math.abs(new Date(d).getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = d;
        }
      }
      // Only use if within 7 days
      if (minDiff <= 7 * 24 * 60 * 60 * 1000) {
        rates.set(dateStr, allRates.get(closest)!);
      }
    }
  }

  return rates;
}

function findClosestPrice(
  dailyPrices: { timestamp: number; date: string; price: number }[],
  targetDate: Date
): number | null {
  if (dailyPrices.length === 0) return null;
  const targetTime = targetDate.getTime();
  const targetDateStr = targetDate.toISOString().split("T")[0];

  const exact = dailyPrices.find((d) => d.date === targetDateStr);
  if (exact) return exact.price;

  let closest = dailyPrices[0];
  let minDiff = Math.abs(dailyPrices[0].timestamp - targetTime);

  for (let i = 1; i < dailyPrices.length; i++) {
    const diff = Math.abs(dailyPrices[i].timestamp - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = dailyPrices[i];
    }
  }

  if (minDiff > 14 * 24 * 60 * 60 * 1000) return null;

  return closest.price;
}

function calculateSpyVariation(
  purchaseDate: Date | null,
  soldAt: Date,
  dailyPrices: { timestamp: number; date: string; price: number }[],
  cclRates: Map<string, number>
): number | null {
  if (!purchaseDate || dailyPrices.length === 0) return null;

  const startPrice = findClosestPrice(dailyPrices, purchaseDate);
  const endPrice = findClosestPrice(dailyPrices, soldAt);

  if (startPrice === null || endPrice === null || startPrice <= 0) return null;

  const startDateStr = purchaseDate.toISOString().split("T")[0];
  const endDateStr = soldAt.toISOString().split("T")[0];

  const startCcl = cclRates.get(startDateStr);
  const endCcl = cclRates.get(endDateStr);

  if (startCcl === undefined || endCcl === undefined || startCcl <= 0 || endCcl <= 0) {
    return null;
  }

  const startPriceARS = startPrice * startCcl;
  const endPriceARS = endPrice * endCcl;

  const variation = ((endPriceARS - startPriceARS) / startPriceARS) * 100;
  return isFinite(variation) ? Math.round(variation * 100) / 100 : null;
}

async function calculatePortfolioAlpha(
  capitalMovements: { type: string; amount: number; createdAt: Date }[],
  currentPortfolioValueARS: number,
  userId: string
): Promise<{ alphaCartera: number | null; spyEquivalenteCartera: number | null }> {
  try {
    const movements = capitalMovements
      .filter((m) => ["APORTE", "CAPITAL_INICIAL", "RETIRO"].includes(m.type))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (movements.length === 0) {
      return { alphaCartera: null, spyEquivalenteCartera: null };
    }

    const firstDate = movements[0].createdAt;
    const now = new Date();

    const spyPrices = await fetchSpyHistoricalPrices(firstDate, now);
    if (spyPrices.length === 0) {
      return { alphaCartera: null, spyEquivalenteCartera: null };
    }

    const allDates = [...movements.map((m) => m.createdAt), now];
    const cclRates = await fetchCclRatesForDates(allDates);

    let portfolioTWR = 1;
    let spyTWR = 1;
    let prevDate = firstDate;
    let portfolioValue = movements[0].type === "RETIRO" ? -movements[0].amount : movements[0].amount;

    for (let i = 1; i <= movements.length; i++) {
      const currentDate = i < movements.length ? movements[i].createdAt : now;

      if (currentDate.getTime() > prevDate.getTime()) {
        const spyStart = findClosestPrice(spyPrices, prevDate);
        const spyEnd = findClosestPrice(spyPrices, currentDate);

        if (spyStart !== null && spyEnd !== null && spyStart > 0) {
          const startDateStr = prevDate.toISOString().split("T")[0];
          const endDateStr = currentDate.toISOString().split("T")[0];
          const startCcl = cclRates.get(startDateStr);
          const endCcl = cclRates.get(endDateStr);

          if (startCcl !== undefined && endCcl !== undefined && startCcl > 0 && endCcl > 0) {
            const spyStartARS = spyStart * startCcl;
            const spyEndARS = spyEnd * endCcl;
            const spyPeriodReturn = (spyEndARS - spyStartARS) / spyStartARS;

            const portfolioStartValue = portfolioValue;
            const netFlow = i < movements.length
              ? (movements[i].type === "RETIRO" ? -movements[i].amount : movements[i].amount)
              : 0;
            const portfolioEndValue = i < movements.length
              ? portfolioStartValue + netFlow
              : currentPortfolioValueARS;

            let portfolioPeriodReturn = 0;
            if (portfolioStartValue > 0) {
              portfolioPeriodReturn = (portfolioEndValue - portfolioStartValue - netFlow) / portfolioStartValue;
            }

            portfolioTWR *= 1 + portfolioPeriodReturn;
            spyTWR *= 1 + spyPeriodReturn;

            portfolioValue = portfolioEndValue;
          }
        }
      }

      prevDate = currentDate;
    }

    const portfolioReturnPct = (portfolioTWR - 1) * 100;
    const spyReturnPct = (spyTWR - 1) * 100;
    const alpha = portfolioReturnPct - spyReturnPct;

    return {
      alphaCartera: isFinite(alpha) ? Math.round(alpha * 100) / 100 : null,
      spyEquivalenteCartera: isFinite(spyReturnPct) ? Math.round(spyReturnPct * 100) / 100 : null,
    };
  } catch {
    return { alphaCartera: null, spyEquivalenteCartera: null };
  }
}

function formatPnLHistoryEntry(
  h: {
    id: string;
    symbol: string;
    name: string;
    assetType: AssetType;
    quantitySold: any;
    buyPriceUSD: any;
    buyPriceARS: any;
    sellPriceUSD: any;
    sellPriceARS: any;
    pnlARS: any;
    pnlUSD: any;
    totalInvestedARS: any;
    soldAt: Date;
  },
  purchaseDate?: Date | null,
  spyVariation?: number | null
): PnLHistoryEntry {
  const quantitySold = Number(h.quantitySold);
  const buyPriceUSD = Number(h.buyPriceUSD);
  let buyPriceARS = Number(h.buyPriceARS);
  const sellPriceUSD = Number(h.sellPriceUSD);
  const sellPriceARS = Number(h.sellPriceARS);
  let pnlARS = Number(h.pnlARS);
  const pnlUSD = Number(h.pnlUSD);

  if (buyPriceARS <= 0 && sellPriceARS > 0 && buyPriceUSD > 0 && sellPriceUSD > 0) {
    const impliedCCL = sellPriceARS / sellPriceUSD;
    buyPriceARS = Math.round(buyPriceUSD * impliedCCL * 100) / 100;
  }

  const totalInvestedARS = buyPriceARS > 0
    ? Math.round(buyPriceARS * quantitySold * 100) / 100
    : Number(h.totalInvestedARS);

  if (buyPriceARS > 0 && sellPriceARS > 0) {
    pnlARS = Math.round((sellPriceARS - buyPriceARS) * quantitySold * 100) / 100;
  }

  const pnlPercent = buyPriceARS > 0
    ? Math.round(((sellPriceARS - buyPriceARS) / buyPriceARS) * 10000) / 100
    : (buyPriceUSD > 0 ? Math.round(((sellPriceUSD - buyPriceUSD) / buyPriceUSD) * 10000) / 100 : 0);

  let daysHeld: number | null = null;
  let annualizedReturn: number | null = null;

  if (purchaseDate) {
    const buyTime = new Date(purchaseDate).getTime();
    const soldTime = new Date(h.soldAt).getTime();
    const diffDays = Math.floor((soldTime - buyTime) / (1000 * 60 * 60 * 24));
    daysHeld = Math.max(0, diffDays);

    if (daysHeld > 0) {
      const totalReturn = pnlPercent / 100;
      if (1 + totalReturn <= 0) {
        annualizedReturn = -100;
      } else {
        const ann = (Math.pow(1 + totalReturn, 365 / daysHeld) - 1) * 100;
        annualizedReturn = isFinite(ann) ? Math.round(ann * 100) / 100 : null;
      }
    }
  }

    const alpha = (spyVariation !== null && spyVariation !== undefined)
      ? Math.round((pnlPercent - spyVariation) * 100) / 100
      : null;

    return {
      id: h.id,
      symbol: h.symbol,
      name: h.name,
      assetType: h.assetType,
      quantitySold,
      buyPriceUSD,
      buyPriceARS,
      sellPriceUSD,
      sellPriceARS,
      pnlARS,
      pnlUSD,
      totalInvestedARS,
      pnlPercent,
      soldAt: h.soldAt.toISOString(),
      purchaseDate: purchaseDate ? purchaseDate.toISOString().split("T")[0] : null,
      daysHeld,
      annualizedReturn,
      spyVariation: spyVariation ?? null,
      alpha,
    };
}

export async function getPnLHistory(): Promise<PnLHistoryEntry[]> {
  const userId = await getUserIdFromToken();
  if (!userId) return [];

  const [history, transactions, assets] = await Promise.all([
    prisma.pnLHistory.findMany({
      where: { userId },
      orderBy: { soldAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: { userId, type: "ADD" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.asset.findMany({
      where: { userId },
    }),
  ]);

  const itemsWithDates = history.map((h) => {
    const buyDate = resolvePurchaseDate(h, transactions, assets);
    return { h, buyDate };
  });

  const validBuyDates = itemsWithDates
    .map((item) => item.buyDate)
    .filter((d): d is Date => d !== null);

  let spyPrices: { timestamp: number; date: string; price: number }[] = [];
  let cclRates = new Map<string, number>();
  if (validBuyDates.length > 0) {
    const minDate = new Date(Math.min(...validBuyDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...itemsWithDates.map((item) => item.h.soldAt.getTime())));
    spyPrices = await fetchSpyHistoricalPrices(minDate, maxDate);

    const allDates = [
      ...validBuyDates,
      ...itemsWithDates.map((item) => item.h.soldAt),
    ];
    cclRates = await fetchCclRatesForDates(allDates);
  }

  return itemsWithDates.map(({ h, buyDate }) => {
    const spyVariation = calculateSpyVariation(buyDate, h.soldAt, spyPrices, cclRates);
    return formatPnLHistoryEntry(h, buyDate, spyVariation);
  });
}

export async function registerCapitalMovement(
  _prevState: PortfolioActionState,
  formData: FormData
): Promise<PortfolioActionState> {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return { success: false, message: "No autenticado" };

    const type = formData.get("type") as string;
    const amount = parseFloat(formData.get("amount") as string);

    if (!type || !["APORTE", "RETIRO", "CAPITAL_INICIAL"].includes(type)) {
      return { success: false, message: "Tipo de movimiento inválido" };
    }
    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: "El monto debe ser un número válido mayor a 0" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { liquidityARS: true, capitalAportado: true, totalRetirado: true },
    });
    const currentLiquidity = Number(user?.liquidityARS ?? 0);
    const currentCapital = Number(user?.capitalAportado ?? 0);
    const currentRetirado = Number(user?.totalRetirado ?? 0);

    if (type === "RETIRO" && amount > currentLiquidity) {
      return { success: false, message: "No hay suficiente liquidez disponible para este retiro" };
    }

    const capitalChange = type === "RETIRO" ? 0 : amount;
    const retiroChange = type === "RETIRO" ? amount : 0;
    const liquidityChange = type === "APORTE" ? amount : type === "RETIRO" ? -amount : 0;

    await prisma.$transaction(async (tx) => {
      await tx.capitalMovement.create({
        data: {
          userId,
          type,
          amount: Math.round(amount * 100) / 100,
          createdAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          capitalAportado: Math.round((currentCapital + capitalChange) * 100) / 100,
          totalRetirado: Math.round((currentRetirado + retiroChange) * 100) / 100,
          ...(type !== "CAPITAL_INICIAL" ? { liquidityARS: Math.round((currentLiquidity + liquidityChange) * 100) / 100 } : {}),
        },
      });
    });

    const labels: Record<string, string> = { APORTE: "Aporte", RETIRO: "Retiro", CAPITAL_INICIAL: "Capital inicial" };
    return { success: true, message: `${labels[type]} registrado correctamente` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error al registrar movimiento de capital",
    };
  }
}

export async function deleteCapitalMovement(
  _prevState: PortfolioActionState,
  formData: FormData
): Promise<PortfolioActionState> {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return { success: false, message: "No autenticado" };

    const movementId = formData.get("movementId") as string;
    if (!movementId) return { success: false, message: "Movimiento no válido" };

    const movement = await prisma.capitalMovement.findFirst({
      where: { id: movementId, userId },
    });
    if (!movement) return { success: false, message: "Movimiento no encontrado" };

    await prisma.$transaction(async (tx) => {
      await tx.capitalMovement.delete({ where: { id: movementId } });

      const remaining = await tx.capitalMovement.findMany({
        where: { userId },
        select: { type: true, amount: true },
      });

      const capitalAportado = remaining
        .filter((m) => m.type === "APORTE" || m.type === "CAPITAL_INICIAL")
        .reduce((sum, m) => sum + Number(m.amount), 0);
      const totalRetirado = remaining
        .filter((m) => m.type === "RETIRO")
        .reduce((sum, m) => sum + Number(m.amount), 0);

      await tx.user.update({
        where: { id: userId },
        data: {
          capitalAportado: Math.round(capitalAportado * 100) / 100,
          totalRetirado: Math.round(totalRetirado * 100) / 100,
        },
      });
    });

    return { success: true, message: "Movimiento eliminado correctamente" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error al eliminar el movimiento",
    };
  }
}

export async function deletePnLOperation(
  _prevState: PortfolioActionState,
  formData: FormData
): Promise<PortfolioActionState> {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return { success: false, message: "No autenticado" };

    const operationId = formData.get("operationId") as string;
    if (!operationId) return { success: false, message: "Operación no válida" };

    const operation = await prisma.pnLHistory.findFirst({
      where: { id: operationId, userId },
    });
    if (!operation) return { success: false, message: "Operación no encontrada" };

    await prisma.$transaction(async (tx) => {
      await tx.pnLHistory.delete({ where: { id: operationId } });

      const capitalMovements = await tx.capitalMovement.findMany({
        where: { userId },
        select: { type: true, amount: true },
      });
      const capitalAportado = capitalMovements
        .filter((m) => m.type === "APORTE" || m.type === "CAPITAL_INICIAL")
        .reduce((sum, m) => sum + Number(m.amount), 0);
      const totalRetirado = capitalMovements
        .filter((m) => m.type === "RETIRO")
        .reduce((sum, m) => sum + Number(m.amount), 0);

      await tx.user.update({
        where: { id: userId },
        data: {
          capitalAportado: Math.round(capitalAportado * 100) / 100,
          totalRetirado: Math.round(totalRetirado * 100) / 100,
        },
      });
    });

    return { success: true, message: "Operación eliminada correctamente" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error al eliminar la operación",
    };
  }
}

export async function getPortfolio(): Promise<{
  assets: AssetWithPrice[];
  summary: PortfolioSummary;
  mep: MEPRate | null;
  pnlHistory: PnLHistoryEntry[];
  capitalAportado: number;
  capitalMovements: CapitalMovementEntry[];
  rentabilidad: number | null;
  alphaCartera: number | null;
  spyEquivalenteCartera: number | null;
}> {
  const userId = await getUserIdFromToken();
  if (!userId) {
    return {
      assets: [],
      summary: {
        totalInvestedUSD: 0, totalInvestedARS: 0, totalValueUSD: 0, totalValueARS: 0,
        totalPnLUSD: 0, totalPnLARS: 0,
        liquidityARS: 0, totalBalanceUSD: 0, totalBalanceARS: 0,
      },
      mep: null,
      pnlHistory: [],
      capitalAportado: 0,
      capitalMovements: [],
      rentabilidad: null,
      alphaCartera: null,
      spyEquivalenteCartera: null,
    };
  }

  const [assets, user, pnlHistoryRaw, addTransactions] = await Promise.all([
    prisma.asset.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { liquidityARS: true, customMEP: true, capitalAportado: true, totalRetirado: true },
    }),
    prisma.pnLHistory.findMany({
      where: { userId },
      orderBy: { soldAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: { userId, type: "ADD" },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const itemsWithDates = pnlHistoryRaw.map((h) => {
    const buyDate = resolvePurchaseDate(h, addTransactions, assets);
    return { h, buyDate };
  });

  const validBuyDates = itemsWithDates
    .map((item) => item.buyDate)
    .filter((d): d is Date => d !== null);

  let spyPrices: { timestamp: number; date: string; price: number }[] = [];
  let cclRates = new Map<string, number>();
  if (validBuyDates.length > 0) {
    const minDate = new Date(Math.min(...validBuyDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...itemsWithDates.map((item) => item.h.soldAt.getTime())));
    spyPrices = await fetchSpyHistoricalPrices(minDate, maxDate);

    const allDates = [
      ...validBuyDates,
      ...itemsWithDates.map((item) => item.h.soldAt),
    ];
    cclRates = await fetchCclRatesForDates(allDates);
  }

  const pnlHistory: PnLHistoryEntry[] = itemsWithDates.map(({ h, buyDate }) => {
    const spyVariation = calculateSpyVariation(buyDate, h.soldAt, spyPrices, cclRates);
    return formatPnLHistoryEntry(h, buyDate, spyVariation);
  });

  if (assets.length === 0) {
    const liquidityARS = Number(user?.liquidityARS ?? 0);
    const capitalAportado = Number(user?.capitalAportado ?? 0);
    const totalRetirado = Number(user?.totalRetirado ?? 0);
    const capitalMovementsRaw = await prisma.capitalMovement.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    const capitalMovements: CapitalMovementEntry[] = capitalMovementsRaw.map((m) => ({
      id: m.id,
      type: m.type as "APORTE" | "RETIRO",
      amount: Number(m.amount),
      createdAt: m.createdAt.toISOString(),
    }));
    const rentabilidad = capitalAportado > 0
      ? Math.round(((liquidityARS + totalRetirado - capitalAportado) / capitalAportado) * 10000) / 100
      : null;
    return {
      assets: [],
      summary: {
        totalInvestedUSD: 0, totalInvestedARS: 0, totalValueUSD: 0, totalValueARS: 0,
        totalPnLUSD: 0, totalPnLARS: 0,
        liquidityARS,
        totalBalanceUSD: 0,
        totalBalanceARS: liquidityARS,
      },
      mep: null,
      pnlHistory,
      capitalAportado,
      capitalMovements,
      rentabilidad,
      alphaCartera: null,
      spyEquivalenteCartera: null,
    };
  }

  const cryptoAssets = assets.filter((a) => a.type === AssetType.CRYPTO);
  const stockAssets = assets.filter((a) => a.type === AssetType.STOCK);

  const [cryptoPrices, stockResult, dolarRates] = await Promise.all([
    fetchCryptoPrices(cryptoAssets.map((a) => a.symbol)),
    fetchStockPrices(stockAssets.map((a) => a.symbol)),
    fetchDolarRates(),
  ]);

  const mep = dolarRates.mep;
  const ccl = dolarRates.ccl;
  const stockPrices = stockResult.prices;
  const stockFallbacks = stockResult.fallbacks;

  const customMEP = user?.customMEP ? Number(user.customMEP) : null;
  const mepVenta = customMEP ?? mep?.venta ?? 0;
  const cclVenta = ccl?.venta ?? 0;
  const cclForCedears = cclVenta;

  const assetsWithPrice: AssetWithPrice[] = assets.map((a) => {
    const qty = Number(a.quantity);
    const avgPrice = Number(a.averagePrice);
    const dbPurchasePriceARS = a.purchasePriceARS != null ? Number(a.purchasePriceARS) : null;

    let currentPriceUSD = 0;
    let currentPriceARS: number | null = null;
    let purchasePriceARS: number | null = null;
    let changePercent = 0;

    if (a.type === AssetType.CRYPTO) {
      const cryptoPrice = cryptoPrices[a.symbol];
      if (cryptoPrice) {
        currentPriceUSD = cryptoPrice.price;
        changePercent = cryptoPrice.percent_change_24h;
        if (mepVenta > 0) {
          currentPriceARS = Math.round(currentPriceUSD * mepVenta * 100) / 100;
          purchasePriceARS = dbPurchasePriceARS ?? Math.round(avgPrice * mepVenta * 100) / 100;
        }
      }
    } else {
      const stockPrice = stockPrices[a.symbol];
      const baseSymbol = a.symbol.endsWith(".BA") ? a.symbol.slice(0, -3) : a.symbol;
      const ratio = getCedearRatio(baseSymbol);

      if (stockPrice) {
        changePercent = stockPrice.changePercent;

        if (a.symbol.endsWith(".BA") && stockPrice.priceARS !== null) {
          currentPriceARS = stockPrice.priceARS;
          currentPriceUSD = cclForCedears > 0 ? Math.round((stockPrice.priceARS / cclForCedears) * 100) / 100 : 0;
          purchasePriceARS = dbPurchasePriceARS;
        } else if (stockPrice.priceUSD !== null) {
          if (ratio) {
            currentPriceUSD = Math.round((stockPrice.priceUSD / ratio.num) * 100) / 100;
            if (mepVenta > 0) {
              currentPriceARS = Math.round(currentPriceUSD * cclForCedears * 100) / 100;
              purchasePriceARS = dbPurchasePriceARS;
            }
          } else {
            currentPriceUSD = stockPrice.priceUSD;
          }
        }
      } else if (a.symbol.endsWith(".BA") && stockFallbacks[a.symbol] && ratio) {
        const fallback = stockFallbacks[a.symbol];
        changePercent = fallback.changePercent;
        currentPriceUSD = Math.round((fallback.priceUSD / ratio.num) * 100) / 100;
        if (cclForCedears > 0) {
          currentPriceARS = Math.round(currentPriceUSD * cclForCedears * 100) / 100;
        }
        purchasePriceARS = dbPurchasePriceARS;
      }
    }

    const pnlARS = purchasePriceARS !== null && currentPriceARS !== null
      ? Math.round((currentPriceARS - purchasePriceARS) * qty * 100) / 100
      : cclForCedears > 0 ? Math.round((currentPriceUSD - avgPrice) * qty * cclForCedears * 100) / 100 : 0;
    const pnlUSD = cclForCedears > 0 ? Math.round(pnlARS / cclForCedears * 100) / 100
      : mepVenta > 0 ? Math.round((currentPriceUSD - avgPrice) * qty * 100) / 100 : 0;
    const pnlPercentUSD = avgPrice > 0 ? Math.round(((currentPriceUSD - avgPrice) / avgPrice) * 10000) / 100 : 0;
    const pnlPercentARS = purchasePriceARS !== null && purchasePriceARS > 0 && currentPriceARS !== null
      ? Math.round(((currentPriceARS - purchasePriceARS) / purchasePriceARS) * 10000) / 100
      : pnlPercentUSD;

    return {
      id: a.id,
      symbol: a.symbol,
      name: a.name,
      type: a.type,
      quantity: qty,
      averagePrice: avgPrice,
      purchaseDate: a.purchaseDate?.toISOString().split("T")[0] ?? "",
      currentPriceUSD,
      currentPriceARS,
      purchasePriceARS,
      changePercent,
      pnlUSD,
      pnlARS,
      pnlPercentUSD,
      pnlPercentARS,
    };
  });

  const capitalAportado = Number(user?.capitalAportado ?? 0);
  const capitalMovementsRaw = await prisma.capitalMovement.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const capitalMovements: CapitalMovementEntry[] = capitalMovementsRaw.map((m) => ({
    id: m.id,
    type: m.type as "APORTE" | "RETIRO",
    amount: Number(m.amount),
    createdAt: m.createdAt.toISOString(),
  }));

  const liquidityARS = Number(user?.liquidityARS ?? 0);
  const totalInvestedUSD = assetsWithPrice.reduce((sum, a) => sum + a.averagePrice * a.quantity, 0);
  const totalInvestedARS = mepVenta > 0
    ? Math.round(assetsWithPrice.reduce((sum, a) => {
        if (a.purchasePriceARS) return sum + a.purchasePriceARS * a.quantity;
        return sum + a.averagePrice * a.quantity * mepVenta;
      }, 0) * 100) / 100
    : 0;
  const totalValueUSD = assetsWithPrice.reduce((sum, a) => sum + a.currentPriceUSD * a.quantity, 0);
  const totalPnLUSD = Math.round((totalValueUSD - totalInvestedUSD) * 100) / 100;
  const totalValueARS = mepVenta > 0
    ? Math.round(assetsWithPrice.reduce((sum, a) => {
        if (a.currentPriceARS) return sum + a.currentPriceARS * a.quantity;
        return sum + a.currentPriceUSD * a.quantity * mepVenta;
      }, 0) * 100) / 100
    : 0;
  const totalPnLARS = Math.round((totalValueARS - totalInvestedARS) * 100) / 100;
  const totalBalanceUSD = Math.round((totalValueUSD + (mepVenta > 0 ? liquidityARS / mepVenta : 0)) * 100) / 100;
  const totalBalanceARS = Math.round((totalValueARS + liquidityARS) * 100) / 100;

  const patrimonioActual = totalBalanceARS;
  const totalRetirado = Number(user?.totalRetirado ?? 0);
  const rentabilidad = capitalAportado > 0
    ? Math.round(((patrimonioActual + totalRetirado - capitalAportado) / capitalAportado) * 10000) / 100
    : null;

  const movementsForAlpha = capitalMovementsRaw.map((m) => ({
    type: m.type,
    amount: Number(m.amount),
    createdAt: m.createdAt,
  }));

  const { alphaCartera, spyEquivalenteCartera } = await calculatePortfolioAlpha(
    movementsForAlpha,
    patrimonioActual,
    userId
  );

  return {
    assets: assetsWithPrice,
    summary: {
      totalInvestedUSD,
      totalInvestedARS,
      totalValueUSD,
      totalValueARS,
      totalPnLUSD,
      totalPnLARS,
      liquidityARS,
      totalBalanceUSD,
      totalBalanceARS,
    },
    mep,
    pnlHistory,
    capitalAportado,
    capitalMovements,
    rentabilidad,
    alphaCartera,
    spyEquivalenteCartera,
  };
}
