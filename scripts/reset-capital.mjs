import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, capitalAportado: true, liquidityARS: true } });
  console.log('Current state:');
  users.forEach(u => console.log(`  ${u.email}: capitalAportado=${Number(u.capitalAportado)}, liquidityARS=${Number(u.liquidityARS)}`));

  await prisma.user.updateMany({ data: { capitalAportado: 0 } });

  const after = await prisma.user.findMany({ select: { id: true, email: true, capitalAportado: true, liquidityARS: true } });
  console.log('\nAfter reset:');
  after.forEach(u => console.log(`  ${u.email}: capitalAportado=${Number(u.capitalAportado)}, liquidityARS=${Number(u.liquidityARS)}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
