ALTER TABLE "wallet_config" ADD COLUMN "monthly_pass_coin_cost" INTEGER NOT NULL DEFAULT 500;
ALTER TABLE "wallet_config" ADD CONSTRAINT "wallet_config_pass_cost_nonnegative" CHECK ("monthly_pass_coin_cost" >= 0);
