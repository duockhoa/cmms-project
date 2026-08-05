import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Applying SQLite triggers for WorkflowHistory immutability...');

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS prevent_update_workflow_history
      BEFORE UPDATE ON WorkflowHistory
      BEGIN
          SELECT RAISE(FAIL, 'WorkflowHistory is immutable and cannot be updated.');
      END;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS prevent_delete_workflow_history
      BEFORE DELETE ON WorkflowHistory
      BEGIN
          SELECT RAISE(FAIL, 'WorkflowHistory is immutable and cannot be deleted.');
      END;
    `);

    console.log('Successfully applied database triggers.');
  } catch (error) {
    console.error('Failed to apply database triggers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
