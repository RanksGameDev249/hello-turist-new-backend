CREATE TABLE "wallet_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "balance_coins" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallet_accounts_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "wallet_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "wallet_accounts_balance_nonnegative" CHECK ("balance_coins" >= 0)
);
CREATE TABLE "wallet_ledger" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "wallet_id" UUID NOT NULL,
  "amount_coins" INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,
  "type" VARCHAR(40) NOT NULL,
  "reference_id" VARCHAR(120),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_ledger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallet_ledger_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallet_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "wallet_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "wallet_ledger_reference_unique" ON "wallet_ledger"("user_id", "type", "reference_id") WHERE "reference_id" IS NOT NULL;
CREATE INDEX "wallet_ledger_user_created_idx" ON "wallet_ledger"("user_id", "created_at");
CREATE TABLE "wallet_config" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "coins_per_ad" INTEGER NOT NULL DEFAULT 1,
  "min_redeem_coins" INTEGER NOT NULL DEFAULT 100,
  "redeem_enabled" BOOLEAN NOT NULL DEFAULT false,
  "monthly_pass_code_enabled" BOOLEAN NOT NULL DEFAULT true,
  "monthly_pass_terms" TEXT NOT NULL DEFAULT 'Monthly pass redemption is subject to availability, validity dates, one redemption per code, non-transferability unless enabled by admin, and applicable service terms.',
  "updated_by" UUID,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_config_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallet_config_coins_per_ad_positive" CHECK ("coins_per_ad" > 0),
  CONSTRAINT "wallet_config_min_redeem_nonnegative" CHECK ("min_redeem_coins" >= 0)
);
CREATE TABLE "wallet_ad_impressions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "impression_id" VARCHAR(120) NOT NULL,
  "reward_coins" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_ad_impressions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallet_ad_impressions_impression_unique" UNIQUE ("impression_id"),
  CONSTRAINT "wallet_ad_impressions_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "wallet_redeem_codes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(80) NOT NULL,
  "type" VARCHAR(30) NOT NULL,
  "coin_cost" INTEGER,
  "pass_months" INTEGER,
  "terms" TEXT,
  "expires_at" TIMESTAMP(3),
  "redeemed_by" UUID,
  "redeemed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_redeem_codes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallet_redeem_codes_code_unique" UNIQUE ("code"),
  CONSTRAINT "wallet_redeem_codes_redeemed_by_fkey" FOREIGN KEY ("redeemed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "wallet_redeem_codes_expiry_idx" ON "wallet_redeem_codes"("expires_at");
CREATE TABLE "wallet_monthly_passes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "code_id" UUID NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_monthly_passes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallet_monthly_passes_code_unique" UNIQUE ("code_id"),
  CONSTRAINT "wallet_monthly_passes_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "wallet_monthly_passes_code_fkey" FOREIGN KEY ("code_id") REFERENCES "wallet_redeem_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "wallet_monthly_passes_user_expiry_idx" ON "wallet_monthly_passes"("user_id", "expires_at");
INSERT INTO "wallet_config" DEFAULT VALUES;
CREATE TABLE "notification_devices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "fcm_token" TEXT NOT NULL,
  "platform" VARCHAR(20) NOT NULL DEFAULT 'ANDROID',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_devices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_devices_token_unique" UNIQUE ("fcm_token"),
  CONSTRAINT "notification_devices_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "notification_devices_user_enabled_idx" ON "notification_devices"("user_id", "enabled");
