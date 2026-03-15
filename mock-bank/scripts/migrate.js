#!/usr/bin/env node

/**
 * Runs prisma migrate deploy with search_path=mockbank.
 *
 * This ensures Prisma's _prisma_migrations table lives in the
 * "mockbank" schema, fully isolated from SpaceSub's "public" schema.
 * The migration SQL also contains CREATE SCHEMA IF NOT EXISTS "mockbank".
 */

const { execSync } = require('child_process');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('[migrate] ERROR: DATABASE_URL is not set');
  process.exit(1);
}

const url = new URL(dbUrl);
url.searchParams.set('schema', 'mockbank');
const env = { ...process.env, DATABASE_URL: url.toString() };

console.log('[migrate] Running prisma migrate deploy with schema=mockbank');

try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env });
  console.log('[migrate] Migrations applied successfully');
} catch (err) {
  console.error('[migrate] Migration failed');
  process.exit(1);
}
