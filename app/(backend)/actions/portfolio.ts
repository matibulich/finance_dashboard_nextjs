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

async function fetchCryptoPrices(symbols: string[]): Promise<Record<string, { price: number; percent_change_24h: number }>> {
  if (symbols.length === 0) return {};
  const apiKey = process.env.CMC_API_KEY;
  if (!apiKey) return {};
  try {
    const url = new URL("https://pro-api.coinmarketcap.com/v3/cryptocurrency/quotes/latest");
    url.searchParams.set("symbol", symbols.join(","));
    const res = await fetch(url.toString(), {
      headers: { "X-CMC_PRO_API_KEY": apiKey, Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const prices: Record<string, { price: number; percent_change_24h: number }> = {};
    for (const [, asset] of Object.entries(data.data) as [string, { symbol: string; quote: { USD: { price: number; percent_change_24h: number } } }][]) {
      prices[asset.symbol] = {
        price: asset.quote.USD.price,
        percent_change_24h: asset.quote.USD.percent_change_24h,
      };
    }
    return prices;
  } catch {
    return {};
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
            const close = data.chart.result[0]?.indicators?.quote?.[0]?.close?.[0];
            const open = data.chart.result[0]?.indicators?.quote?.[0]?.open?.[0];
            const changePercent = open && open > 0 ? Math.round(((close - open) / open) * 10000) / 100 : 0;
            const yahooPrice = meta.regularMarketPrice;
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
            totalHistoricallyInvestedARS: {
              increment: Math.round(costARS * 100) / 100,
            },
          },
        });
      } else if (costARS > 0) {
        await tx.user.update({
          where: { id: userId },
          data: {
            totalHistoricallyInvestedARS: {
              increment: Math.round(costARS * 100) / 100,
            },
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
    const buyPriceARS = asset.purchasePriceARS != null ? Number(asset.purchasePriceARS) : 0;

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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalHistoricallyInvestedARS: true },
    });
    const totalInvestedARS = Number(user?.totalHistoricallyInvestedARS ?? 0);
    const costOfSold = buyPriceARS * quantityToSell;
    const pnlPercent = totalInvestedARS > 0
      ? Math.round((pnlARS / totalInvestedARS) * 10000) / 100
      : 0;

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

export async function getPnLHistory(): Promise<PnLHistoryEntry[]> {
  const userId = await getUserIdFromToken();
  if (!userId) return [];

  const history = await prisma.pnLHistory.findMany({
    where: { userId },
    orderBy: { soldAt: "desc" },
  });

  return history.map((h) => {
    const totalInvested = Number(h.totalInvestedARS);
    const pnl = Number(h.pnlARS);
    return {
      id: h.id,
      symbol: h.symbol,
      name: h.name,
      assetType: h.assetType,
      quantitySold: Number(h.quantitySold),
      buyPriceUSD: Number(h.buyPriceUSD),
      buyPriceARS: Number(h.buyPriceARS),
      sellPriceUSD: Number(h.sellPriceUSD),
      sellPriceARS: Number(h.sellPriceARS),
      pnlARS: pnl,
      pnlUSD: Number(h.pnlUSD),
      totalInvestedARS: totalInvested,
      pnlPercent: totalInvested > 0 ? Math.round((pnl / totalInvested) * 10000) / 100 : 0,
      soldAt: h.soldAt.toISOString(),
    };
  });
}

export async function resetHistoricallyInvested(): Promise<PortfolioActionState> {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return { success: false, message: "No autenticado" };

    await prisma.user.update({
      where: { id: userId },
      data: {
        totalHistoricallyInvestedARS: 0,
        pnlResetDate: new Date(),
      },
    });

    return { success: true, message: "Inversión histórica reseteada" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error al resetear",
    };
  }
}

export async function getPortfolio(): Promise<{
  assets: AssetWithPrice[];
  summary: PortfolioSummary;
  mep: MEPRate | null;
  pnlHistory: PnLHistoryEntry[];
  totalHistoricallyInvestedARS: number;
  pnlResetDate: string | null;
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
      totalHistoricallyInvestedARS: 0,
      pnlResetDate: null,
    };
  }

  const assets = await prisma.asset.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { liquidityARS: true, customMEP: true, totalHistoricallyInvestedARS: true, pnlResetDate: true } });

  const pnlResetDate = user?.pnlResetDate ?? null;

  const pnlHistoryRaw = await prisma.pnLHistory.findMany({
    where: {
      userId,
      ...(pnlResetDate ? { soldAt: { gte: pnlResetDate } } : {}),
    },
    orderBy: { soldAt: "desc" },
  });

  const pnlHistory: PnLHistoryEntry[] = pnlHistoryRaw.map((h) => {
    const totalInvested = Number(h.totalInvestedARS);
    const pnl = Number(h.pnlARS);
    return {
      id: h.id,
      symbol: h.symbol,
      name: h.name,
      assetType: h.assetType,
      quantitySold: Number(h.quantitySold),
      buyPriceUSD: Number(h.buyPriceUSD),
      buyPriceARS: Number(h.buyPriceARS),
      sellPriceUSD: Number(h.sellPriceUSD),
      sellPriceARS: Number(h.sellPriceARS),
      pnlARS: pnl,
      pnlUSD: Number(h.pnlUSD),
      totalInvestedARS: totalInvested,
      pnlPercent: totalInvested > 0 ? Math.round((pnl / totalInvested) * 10000) / 100 : 0,
      soldAt: h.soldAt.toISOString(),
    };
  });

  if (assets.length === 0) {
    const liquidityARS = Number(user?.liquidityARS ?? 0);
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
      totalHistoricallyInvestedARS: Number(user?.totalHistoricallyInvestedARS ?? 0),
      pnlResetDate: pnlResetDate?.toISOString() ?? null,
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
          purchasePriceARS = dbPurchasePriceARS ?? (ratio ? Math.round((avgPrice / ratio.num) * cclForCedears * 100) / 100 : null);
        } else if (stockPrice.priceUSD !== null) {
          if (ratio) {
            currentPriceUSD = Math.round((stockPrice.priceUSD / ratio.num) * 100) / 100;
            if (mepVenta > 0) {
              currentPriceARS = Math.round(currentPriceUSD * cclForCedears * 100) / 100;
              purchasePriceARS = dbPurchasePriceARS ?? Math.round((avgPrice / ratio.num) * cclForCedears * 100) / 100;
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
        purchasePriceARS = dbPurchasePriceARS ?? Math.round((avgPrice / ratio.num) * cclForCedears * 100) / 100;
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
    totalHistoricallyInvestedARS: Number(user?.totalHistoricallyInvestedARS ?? 0),
    pnlResetDate: pnlResetDate?.toISOString() ?? null,
  };
}
