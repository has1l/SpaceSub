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

-- CreateEnum
CREATE TYPE "mockbank"."RecurringPaymentStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "mockbank"."recurring_payments" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "category" "mockbank"."TransactionCategory" NOT NULL DEFAULT 'SUBSCRIPTIONS',
    "period_days" INTEGER NOT NULL DEFAULT 30,
    "next_charge_date" TIMESTAMP(3) NOT NULL,
    "status" "mockbank"."RecurringPaymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_payments_pkey" PRIMARY KEY ("id")
);

-- CreateEnum
CREATE TYPE "mockbank"."UserSubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "mockbank"."service_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logo_url" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "period_days" INTEGER NOT NULL DEFAULT 30,
    "category" "mockbank"."TransactionCategory" NOT NULL DEFAULT 'SUBSCRIPTIONS',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mockbank"."user_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "recurring_payment_id" TEXT,
    "status" "mockbank"."UserSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_catalog_merchant_key" ON "mockbank"."service_catalog"("merchant");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_recurring_payment_id_key" ON "mockbank"."user_subscriptions"("recurring_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_user_id_service_id_key" ON "mockbank"."user_subscriptions"("user_id", "service_id");

-- AddForeignKey
ALTER TABLE "mockbank"."accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mockbank"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mockbank"."transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "mockbank"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mockbank"."recurring_payments" ADD CONSTRAINT "recurring_payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "mockbank"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mockbank"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mockbank"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mockbank"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "mockbank"."service_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mockbank"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "mockbank"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mockbank"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_recurring_payment_id_fkey" FOREIGN KEY ("recurring_payment_id") REFERENCES "mockbank"."recurring_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
