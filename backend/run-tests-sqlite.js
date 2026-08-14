const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const originalSchema = fs.readFileSync(schemaPath, 'utf8');

let runError = null;

try {
  console.log('Temporarily converting schema.prisma to sqlite for local spec tests...');
  let tempSchema = originalSchema.replace('provider = "mysql"', 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, tempSchema, 'utf8');

  console.log('Generating SQLite Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('Running tests...');
  execSync('npx jest --runInBand', { stdio: 'inherit' });
} catch (err) {
  console.error('Error during test execution:', err);
  runError = err;
} finally {
  console.log('Restoring original schema.prisma (mysql)...');
  fs.writeFileSync(schemaPath, originalSchema, 'utf8');
  
  console.log('Generating MySQL Prisma Client...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to regenerate mysql client:', e);
  }

  if (runError) {
    process.exit(1);
  }
}
