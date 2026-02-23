-- CreateEnum
CREATE TYPE "BankProvider" AS ENUM ('FLEX');

-- CreateEnum
CREATE TYPE "BankConnectionStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "BankSyncStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "bank_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "BankProvider" NOT NULL,
    "status" "BankConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_sync_logs" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "status" "BankSyncStatus" NOT NULL,
    "imported_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imported_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "provider" "BankProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "description" TEXT NOT NULL,
    "merchant" TEXT,
    "account_external_id" TEXT,
    "raw" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imported_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_connections_user_id_provider_key" ON "bank_connections"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "imported_transactions_connection_id_external_id_key" ON "imported_transactions"("connection_id", "external_id");

-- AddForeignKey
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_sync_logs" ADD CONSTRAINT "bank_sync_logs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "bank_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_transactions" ADD CONSTRAINT "imported_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_transactions" ADD CONSTRAINT "imported_transactions_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "bank_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
