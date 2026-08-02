import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const toDelete = await prisma.pnLHistory.findMany({
    where: {
      NOT: { symbol: { in: ['QCOM', 'MCD'] } },
    },
  });
  console.log(`Deleting ${toDelete.length} PnLHistory entries:`);
  toDelete.forEach(h => console.log(`  - ${h.symbol} (${Number(h.quantitySold)} units, ${h.soldAt.toISOString().split('T')[0]})`));

  const result = await prisma.pnLHistory.deleteMany({
    where: {
      NOT: { symbol: { in: ['QCOM', 'MCD'] } },
    },
  });
  console.log(`\nDeleted ${result.count} PnLHistory entries`);

  const remaining = await prisma.pnLHistory.findMany();
  console.log(`\nRemaining PnLHistory entries: ${remaining.length}`);
  remaining.forEach(h => console.log(`  - ${h.symbol} (${Number(h.quantitySold)} units)`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
