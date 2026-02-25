-- AlterTable
ALTER TABLE "bank_connections" ADD COLUMN     "encrypted_access_token" TEXT,
ADD COLUMN     "token_fingerprint" TEXT;
