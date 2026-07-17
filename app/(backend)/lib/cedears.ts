import cedearsData from "@/cedears.json";

type CedearEntry = {
  compania: string;
  ticker: string;
  mercado: string;
  ratio: string;
};

export function getCedearRatio(symbol: string): { num: number; den: number } | null {
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
