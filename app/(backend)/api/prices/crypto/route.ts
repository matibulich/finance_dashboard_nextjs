import { NextRequest, NextResponse } from "next/server";
import { fetchCryptoPrices } from "@/app/(backend)/lib/crypto";

type CryptoPriceData = {
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

  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "COINGECKO_API_KEY no configurada" },
      { status: 500 }
    );
  }

  try {
    const symbolList = symbols.split(",").map((s) => s.trim().toUpperCase());
    const prices = await fetchCryptoPrices(symbolList, {});

    const result: Record<string, CryptoPriceData> = {};
    for (const [sym, data] of Object.entries(prices)) {
      result[sym] = {
        symbol: sym,
        name: sym,
        price: data.price,
        percent_change_24h: data.percent_change_24h,
      };
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  } catch {
    return NextResponse.json(
      { error: "Error al conectar con CoinGecko" },
      { status: 502 }
    );
  }
}