import { NextRequest, NextResponse } from "next/server";
import cedearsData from "@/cedears.json";

type StockPriceData = {
  symbol: string;
  name: string;
  priceARS: number | null;
  priceUSD: number | null;
  changePercent: number;
};

type CedearEntry = {
  compania: string;
  ticker: string;
  mercado: string;
  ratio: string;
};

function getCedearRatio(symbol: string): { num: number; den: number } | null {
  const entry = (cedearsData.dataset as CedearEntry[]).find(
    (item) => item.ticker === symbol
  );
  if (!entry) return null;
  const parts = entry.ratio.split(":");
  if (parts.length !== 2) return null;
  const num = parseInt(parts[0], 10);
  const den = parseInt(parts[1], 10);
  if (isNaN(num) || isNaN(den) || num === 0 || den === 0) return null;
  return { num, den };
}

async function fetchCCLRate(): Promise<number | null> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares", {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const ccl = data.find((d: { casa: string }) => d.casa === "contadoconliqui");
    return ccl?.venta ?? null;
  } catch {
    return null;
  }
}

async function fetchMEPRate(): Promise<number | null> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares", {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const mep = data.find((d: { casa: string }) => d.casa === "bolsa");
    return mep?.venta ?? null;
  } catch {
    return null;
  }
}

async function fetchYahooPrice(
  symbol: string,
  cclRate: number
): Promise<{
  priceUSD: number | null;
  priceARS: number | null;
  name: string;
  changePercent: number;
} | null> {
  try {
    const isDotBA = symbol.endsWith(".BA");
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const close = data.chart.result[0]?.indicators?.quote?.[0]?.close?.[0];
    const open = data.chart.result[0]?.indicators?.quote?.[0]?.open?.[0];
    const changePercent = open && open > 0 ? ((close - open) / open) * 100 : 0;

    const yahooPrice = meta.regularMarketPrice;

    if (isDotBA) {
      return {
        priceUSD: null,
        priceARS: yahooPrice,
        name: meta.shortName ?? meta.longName ?? symbol,
        changePercent: Math.round(changePercent * 100) / 100,
      };
    }

    const baseSymbol = symbol;
    const ratio = getCedearRatio(baseSymbol);
    if (ratio && yahooPrice > 0 && cclRate > 0) {
      const cedearUSD = yahooPrice / ratio.num;
      return {
        priceUSD: Math.round(cedearUSD * 100) / 100,
        priceARS: Math.round(cedearUSD * cclRate * 100) / 100,
        name: meta.shortName ?? meta.longName ?? symbol,
        changePercent: Math.round(changePercent * 100) / 100,
      };
    }

    return {
      priceUSD: yahooPrice,
      priceARS: null,
      name: meta.shortName ?? meta.longName ?? symbol,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const symbolsParam = searchParams.get("symbols");

  if (!symbolsParam) {
    return NextResponse.json(
      { error: "Query param 'symbols' requerido (ej: LLY.BA,AAPL)" },
      { status: 400 }
    );
  }

  const symbols = symbolsParam.split(",").map((s) => s.trim()).filter(Boolean);

  try {
    const cclRate = (await fetchCCLRate()) ?? (await fetchMEPRate()) ?? 0;
    const results = await Promise.allSettled(
      symbols.map((s) => fetchYahooPrice(s, cclRate))
    );

    const prices: Record<string, StockPriceData> = {};

    symbols.forEach((symbol, i) => {
      const result = results[i];
      if (result.status === "fulfilled" && result.value) {
        const { priceUSD, priceARS, name, changePercent } = result.value;
        prices[symbol] = {
          symbol,
          name,
          priceUSD,
          priceARS,
          changePercent,
        };
      } else {
        prices[symbol] = {
          symbol,
          name: symbol,
          priceUSD: null,
          priceARS: null,
          changePercent: 0,
        };
      }
    });

    return NextResponse.json(prices, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener precios de acciones" },
      { status: 502 }
    );
  }
}
