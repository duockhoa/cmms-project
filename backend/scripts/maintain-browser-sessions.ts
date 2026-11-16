import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { BrowserSessionService } from '../src/modules/auth/browser-session.service';
import { HrmIdentityService } from '../src/modules/auth/hrm-identity.service';

const prisma = new PrismaService();
async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--execute', '--audit'].includes(arg))) throw new Error('Supported options: --audit (default), --execute');
  if (args.includes('--audit') && args.includes('--execute')) throw new Error('Choose either --audit or --execute');
  const config = new ConfigService();
  const identities = new HrmIdentityService(config, prisma);
  const sessions = new BrowserSessionService(config, prisma, identities);
  const summary = await prisma.browserSession.groupBy({ by: ['state', 'source', 'tokenOwnership'], _count: { _all: true } });
  console.log(JSON.stringify({ groups: summary, maintenance: await sessions.maintain(args.includes('--execute')) }, null, 2));
}
main().catch((error) => { console.error('Session maintenance failed:', error.code || error.name); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
