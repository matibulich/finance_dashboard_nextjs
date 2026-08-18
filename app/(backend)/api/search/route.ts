import { NextRequest, NextResponse } from "next/server";
import { SearchResult } from "@/app/(backend)/types/portfolio";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type");

  if (!query || query.length < 1) {
    return NextResponse.json([]);
  }

  if (type === "CRYPTO") {
    return searchCrypto(query);
  }
  return searchStocks(query);
}

async function searchCrypto(query: string): Promise<NextResponse> {
  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) return NextResponse.json([]);

  const lower = query.toLowerCase();
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
      {
        headers: { "x-cg-pro-api-key": apiKey, Accept: "application/json" },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();

    const coins = data.coins ?? [];
    const results: SearchResult[] = coins
      .filter(
        (c: { symbol: string; name: string; id: string }) =>
          c.symbol.toLowerCase().startsWith(lower) ||
          c.name.toLowerCase().startsWith(lower)
      )
      .slice(0, 10)
      .map((c: { symbol: string; name: string; id: string }) => ({
        symbol: c.symbol.toUpperCase(),
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