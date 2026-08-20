"use server";

function symbolToId(symbol: string, symbolToIdMap: Record<string, string>): string | null {
  const upper = symbol.toUpperCase();
  return symbolToIdMap[upper] ?? null;
}

export async function resolveSymbolViaSearch(symbol: string): Promise<string | null> {
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers: HeadersInit = {
    Accept: "application/json",
  };
  if (apiKey) {
    headers["x-cg-pro-api-key"] = apiKey;
  }
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`,
      {
        headers,
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

export async function fetchCryptoPrices(
  symbols: string[],
  symbolToIdMap: Record<string, string> = {}
): Promise<Record<string, { price: number; percent_change_24h: number }>> {
  if (symbols.length === 0) return {};
  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) return {};
  try {
    const idMap: Record<string, string> = {};
    const promises: Array<Promise<void>> = [];

    for (const sym of symbols) {
      promises.push(
        (async () => {
          const id = await resolveSymbolViaSearch(sym);
          if (id) idMap[sym] = id;
        })()
      );
    }

    await Promise.all(promises);

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