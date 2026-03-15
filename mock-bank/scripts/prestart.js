#!/usr/bin/env node

/**
 * Pre-start script for mock-bank on Railway.
 *
 * 1. Ensures DATABASE_URL uses search_path=mockbank so that Prisma's
 *    _prisma_migrations table lives in the mockbank schema, fully
 *    isolated from SpaceSub's public schema.
 *
 * 2. Creates the mockbank schema if it doesn't exist (the migration
 *    also does this, but we need it before Prisma tries to read
 *    _prisma_migrations).
 *
 * 3. Cleans up any old failed mock-bank migration records from
 *    public._prisma_migrations (leftover from before schema isolation).
 */

const { execSync } = require('child_process');

// Step 1: Ensure DATABASE_URL has schema=mockbank
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('ERROR: DATABASE_URL is not set');
  process.exit(1);
}

const url = new URL(dbUrl);
url.searchParams.set('schema', 'mockbank');
process.env.DATABASE_URL = url.toString();

console.log('[prestart] DATABASE_URL search_path set to mockbank');

// Step 2: Create schema + clean up old migration records using psql-like approach
// We use a small inline Node script with pg to avoid requiring psql binary
const setupSql = `
CREATE SCHEMA IF NOT EXISTS "mockbank";

-- Remove any old mock-bank migration entries from public._prisma_migrations
-- (left over from failed deploys before schema isolation).
-- SpaceSub migrations use names like "20250..." while mock-bank used "20260223...", "20260226...", "20260227..."
DELETE FROM public._prisma_migrations
WHERE migration_name IN (
  '20260223193005_init',
  '20260226062143_add_connection_codes',
  '20260227120000_add_transaction_type_category_merchant'
);
`;

// Use Prisma's built-in $executeRawUnsafe via a temp script
// Simpler: just use prisma db execute
const fs = require('fs');
const tmpFile = '/tmp/mockbank-prestart.sql';
fs.writeFileSync(tmpFile, setupSql);

try {
  execSync(`npx prisma db execute --file ${tmpFile} --schema prisma/schema.prisma`, {
    stdio: 'inherit',
    env: { ...process.env },
  });
  console.log('[prestart] Schema "mockbank" ensured, old migration records cleaned');
} catch (err) {
  // If public._prisma_migrations doesn't exist yet, DELETE will fail — that's fine
  console.log('[prestart] Schema setup completed (some cleanup steps may have been skipped)');
}

// Step 3: Run prisma migrate deploy
try {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env },
  });
  console.log('[prestart] Migrations applied successfully');
} catch (err) {
  console.error('[prestart] Migration failed:', err.message);
  process.exit(1);
}
