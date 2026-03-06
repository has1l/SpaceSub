-- CreateTable
CREATE TABLE "connection_codes" (
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
CREATE UNIQUE INDEX "connection_codes_code_hash_key" ON "connection_codes"("code_hash");
