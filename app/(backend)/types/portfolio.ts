import { AssetType } from "@prisma/client";

export type AssetData = {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  quantity: number;
  averagePrice: number;
  purchaseDate: string;
};

export type AssetWithPrice = AssetData & {
  currentPriceUSD: number;
  currentPriceARS: number | null;
  purchasePriceARS: number | null;
  changePercent: number;
  pnlUSD: number;
  pnlARS: number;
  pnlPercentUSD: number;
  pnlPercentARS: number;
};

export type PortfolioSummary = {
  totalInvestedUSD: number;
  totalInvestedARS: number;
  totalValueUSD: number;
  totalValueARS: number;
  totalPnLUSD: number;
  totalPnLARS: number;
  liquidityARS: number;
  totalBalanceUSD: number;
  totalBalanceARS: number;
};

export type AddAssetFormData = {
  type: AssetType;
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  purchaseDate: string;
};

export type RemoveAssetFormData = {
  assetId: string;
  quantity: number;
};

export type PortfolioActionState = {
  success: boolean;
  message: string;
};

export type MEPRate = {
  compra: number;
  venta: number;
  fechaActualizacion: string;
};

export type SearchResult = {
  symbol: string;
  name: string;
};

export type PnLHistoryEntry = {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  quantitySold: number;
  buyPriceUSD: number;
  buyPriceARS: number;
  sellPriceUSD: number;
  sellPriceARS: number;
  pnlARS: number;
  pnlUSD: number;
  totalInvestedARS: number;
  pnlPercent: number;
  soldAt: string;
};
