-- CreateTable
CREATE TABLE "detected_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "normalized_merchant" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "period_type" "BillingCycle" NOT NULL,
    "last_charge_date" TIMESTAMP(3) NOT NULL,
    "next_expected_charge" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transaction_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detected_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "detected_subscriptions_user_id_is_active_idx" ON "detected_subscriptions"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "detected_subscriptions_next_expected_charge_idx" ON "detected_subscriptions"("next_expected_charge");

-- CreateIndex
CREATE UNIQUE INDEX "detected_subscriptions_user_id_normalized_merchant_amount_c_key" ON "detected_subscriptions"("user_id", "normalized_merchant", "amount", "currency");

-- CreateIndex
CREATE INDEX "imported_transactions_user_id_occurred_at_idx" ON "imported_transactions"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "imported_transactions_user_id_description_idx" ON "imported_transactions"("user_id", "description");

-- AddForeignKey
ALTER TABLE "detected_subscriptions" ADD CONSTRAINT "detected_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
