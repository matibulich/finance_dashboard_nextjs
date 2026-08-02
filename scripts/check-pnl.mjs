import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const history = await prisma.pnLHistory.findMany({ orderBy: { soldAt: 'desc' } });
  console.log('PnLHistory entries:');
  history.forEach(h => console.log({ id: h.id, symbol: h.symbol, quantity: Number(h.quantitySold), soldAt: h.soldAt }));
  
  const assets = await prisma.asset.findMany();
  console.log('\nCurrent assets:');
  assets.forEach(a => console.log({ id: a.id, symbol: a.symbol, quantity: Number(a.quantity) }));
  
  const transactions = await prisma.transaction.findMany({ orderBy: { createdAt: 'desc' }, take: 30 });
  console.log('\nRecent transactions:');
  transactions.forEach(t => console.log({ id: t.id, symbol: t.symbol, type: t.type, quantity: Number(t.quantity), assetId: t.assetId }));
}
main().catch(console.error).finally(() => prisma.$disconnect());
