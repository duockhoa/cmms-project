/** SELECT-only audit. Does not call login, synchronize users, merge accounts, or rewrite history. */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { buildIdentityAudit, selectHrmIdentity } from '../src/modules/auth/identity-resolution';

const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, hrmId: true, email: true, name: true, dataSource: true, isActive: true },
    orderBy: { id: 'asc' },
  });
  const report: any = buildIdentityAudit(users);
  const snapshot = process.argv.find(argument => argument.startsWith('--snapshot='))?.slice('--snapshot='.length);
  if (snapshot) {
    const body = JSON.parse(readFileSync(snapshot, 'utf8'));
    const profiles = Array.isArray(body) ? body : body.users || body.data;
    if (!Array.isArray(profiles)) throw new Error('Invalid HRM snapshot');
    report.snapshotReview = profiles.map(profile => {
      const result = selectHrmIdentity(users, profile);
      return { hrmId: String(profile.id), status: result.user ? 'LINKED' : result.reason || 'NEW_IDENTITY',
        candidateUserIds: result.candidates.map(user => user.id) };
    });
  }
  // No email addresses, names, credentials or tokens are included in the report.
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
main().catch(error => {
  console.error('IDENTITY_AUDIT_FAILED', error?.code || error?.name || 'Error');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
