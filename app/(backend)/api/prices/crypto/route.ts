import { NextRequest, NextResponse } from "next/server";

type CMCSymbolData = {
  symbol: string;
  name: string;
  price: number;
  percent_change_24h: number;
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const symbols = searchParams.get("symbols");

  if (!symbols) {
    return NextResponse.json(
      { error: "Query param 'symbols' requerido (ej: BTC,ETH)" },
      { status: 400 }
    );
  }

  const apiKey = process.env.CMC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "CMC_API_KEY no configurada" },
      { status: 500 }
    );
  }

  try {
    const url = new URL("https://pro-api.coinmarketcap.com/v3/cryptocurrency/quotes/latest");
    url.searchParams.set("symbol", symbols);

    const res = await fetch(url.toString(), {
      headers: {
        "X-CMC_PRO_API_KEY": apiKey,
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Error al obtener precios de CoinMarketCap" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const prices: Record<string, CMCSymbolData> = {};

    for (const [, asset] of Object.entries(data.data) as [string, { symbol: string; name: string; quote: { USD: { price: number; percent_change_24h: number } } }][]) {
      prices[asset.symbol] = {
        symbol: asset.symbol,
        name: asset.name,
        price: asset.quote.USD.price,
        percent_change_24h: asset.quote.USD.percent_change_24h,
      };
    }

    return NextResponse.json(prices, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  } catch {
    return NextResponse.json(
      { error: "Error al conectar con CoinMarketCap" },
      { status: 502 }
    );
  }
}
