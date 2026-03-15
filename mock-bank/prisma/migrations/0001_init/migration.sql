-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "mockbank";

-- CreateEnum
CREATE TYPE "mockbank"."TransactionType" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER');

-- CreateEnum
CREATE TYPE "mockbank"."TransactionCategory" AS ENUM ('SUBSCRIPTIONS', 'SUPERMARKETS', 'TRANSFERS', 'DIGITAL_SERVICES', 'INVESTMENTS', 'TRANSPORT', 'RESTAURANTS', 'HEALTH', 'OTHER');

-- CreateTable
CREATE TABLE "mockbank"."users" (
    "id" TEXT NOT NULL,
    "yandex_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mockbank"."accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "initial_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mockbank"."transactions" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "description" TEXT NOT NULL,
    "merchant" TEXT,
    "type" "mockbank"."TransactionType" NOT NULL DEFAULT 'EXPENSE',
    "category" "mockbank"."TransactionCategory" NOT NULL DEFAULT 'OTHER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mockbank"."connection_codes" (
    "id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "encrypted_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "flex_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_yandex_id_key" ON "mockbank"."users"("yandex_id");

-- CreateIndex
CREATE INDEX "transactions_account_id_date_idx" ON "mockbank"."transactions"("account_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "connection_codes_code_hash_key" ON "mockbank"."connection_codes"("code_hash");

-- AddForeignKey
ALTER TABLE "mockbank"."accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mockbank"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mockbank"."transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "mockbank"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
