import { NextRequest, NextResponse } from "next/server";
import { SearchResult } from "@/app/(backend)/types/portfolio";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type"); // "CRYPTO" | "STOCK"

  if (!query || query.length < 1) {
    return NextResponse.json([]);
  }

  if (type === "CRYPTO") {
    return searchCrypto(query);
  }
  return searchStocks(query);
}

async function searchCrypto(query: string): Promise<NextResponse> {
  const apiKey = process.env.CMC_API_KEY;
  if (!apiKey) return NextResponse.json([]);

  const upper = query.toUpperCase();
  try {
    const res = await fetch(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?limit=200",
      {
        headers: { "X-CMC_PRO_API_KEY": apiKey, Accept: "application/json" },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();

    const results: SearchResult[] = data.data
      .filter(
        (c: { symbol: string; name: string }) =>
          c.symbol.toUpperCase().startsWith(upper) ||
          c.name.toUpperCase().startsWith(upper)
      )
      .slice(0, 10)
      .map((c: { symbol: string; name: string }) => ({
        symbol: c.symbol,
        name: c.name,
      }));

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}

async function searchStocks(query: string): Promise<NextResponse> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotes_count=10&news_count=0`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();

    const results: SearchResult[] = (data.quotes ?? [])
      .filter(
        (q: { symbol?: string; longname?: string; shortname?: string }) =>
          q.symbol && (q.longname || q.shortname)
      )
      .slice(0, 10)
      .map((q: { symbol: string; longname?: string; shortname?: string }) => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
      }));

    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  } catch {
    return NextResponse.json([]);
  }
}
