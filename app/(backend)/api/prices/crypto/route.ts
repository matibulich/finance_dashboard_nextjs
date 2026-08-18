import { NextRequest, NextResponse } from "next/server";

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

type CryptoPriceData = {
  symbol: string;
  name: string;
  price: number;
  percent_change_24h: number;
};

function symbolToId(symbol: string): string | null {
  const upper = symbol.toUpperCase();
  return SYMBOL_TO_COINGECKO_ID[upper] ?? null;
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
    const idMap: Record<string, string> = {};
    const unresolved: string[] = [];

    for (const sym of symbolList) {
      const id = symbolToId(sym);
      if (id) {
        idMap[sym] = id;
      } else {
        unresolved.push(sym);
      }
    }

    if (unresolved.length > 0) {
      const resolved = await Promise.all(
        unresolved.map(async (sym) => {
          const id = await resolveSymbolViaSearch(sym);
          if (id) idMap[sym] = id;
        })
      );
    }

    const ids = Object.values(idMap);
    if (ids.length === 0) {
      return NextResponse.json({});
    }

    const url = new URL("https://api.coingecko.com/api/v3/simple/price");
    url.searchParams.set("ids", ids.join(","));
    url.searchParams.set("vs_currencies", "usd");
    url.searchParams.set("include_24hr_change", "true");

    const res = await fetch(url.toString(), {
      headers: {
        "x-cg-pro-api-key": apiKey,
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Error al obtener precios de CoinGecko" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const prices: Record<string, CryptoPriceData> = {};

    for (const [sym, id] of Object.entries(idMap)) {
      const coinData = data[id];
      if (coinData) {
        prices[sym] = {
          symbol: sym,
          name: sym,
          price: coinData.usd,
          percent_change_24h: coinData.usd_24h_change ?? 0,
        };
      }
    }

    return NextResponse.json(prices, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  } catch {
    return NextResponse.json(
      { error: "Error al conectar con CoinGecko" },
      { status: 502 }
    );
  }
}