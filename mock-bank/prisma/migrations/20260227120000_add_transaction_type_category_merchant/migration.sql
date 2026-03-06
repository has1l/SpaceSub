-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('SUBSCRIPTIONS', 'SUPERMARKETS', 'TRANSFERS', 'DIGITAL_SERVICES', 'INVESTMENTS', 'TRANSPORT', 'RESTAURANTS', 'HEALTH', 'OTHER');

-- AlterTable: Account — rename balance to initial_balance
ALTER TABLE "accounts" RENAME COLUMN "balance" TO "initial_balance";

-- AlterTable: Transaction — add new columns
ALTER TABLE "transactions" ADD COLUMN "merchant" TEXT;
ALTER TABLE "transactions" ADD COLUMN "type" "TransactionType" NOT NULL DEFAULT 'EXPENSE';
ALTER TABLE "transactions" ADD COLUMN "category" "TransactionCategory" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "transactions_account_id_date_idx" ON "transactions"("account_id", "date");
