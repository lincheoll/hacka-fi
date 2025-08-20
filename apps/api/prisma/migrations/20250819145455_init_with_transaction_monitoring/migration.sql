-- CreateTable
CREATE TABLE "prize_pools" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hackathon_id" TEXT NOT NULL,
    "total_amount" TEXT NOT NULL,
    "contract_pool_id" TEXT,
    "contract_address" TEXT,
    "is_deposited" BOOLEAN NOT NULL DEFAULT false,
    "deposit_tx_hash" TEXT,
    "is_distributed" BOOLEAN NOT NULL DEFAULT false,
    "distribution_tx_hash" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "prize_pools_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "prize_pool_deposits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "prize_pool_id" INTEGER NOT NULL,
    "depositor_address" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "block_number" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" DATETIME,
    CONSTRAINT "prize_pool_deposits_prize_pool_id_fkey" FOREIGN KEY ("prize_pool_id") REFERENCES "prize_pools" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "prize_distributions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "prize_pool_id" INTEGER NOT NULL,
    "hackathon_id" TEXT NOT NULL,
    "recipient_address" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "amount" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,
    "tx_hash" TEXT,
    "block_number" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "executed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,
    CONSTRAINT "prize_distributions_prize_pool_id_fkey" FOREIGN KEY ("prize_pool_id") REFERENCES "prize_pools" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "distribution_transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hackathon_id" TEXT NOT NULL,
    "prize_pool_id" INTEGER NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitted_at" DATETIME NOT NULL,
    "confirmed_at" DATETIME,
    "failed_at" DATETIME,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "gas_price" TEXT,
    "gas_limit" TEXT,
    "gas_used" TEXT,
    "block_number" TEXT,
    "error" TEXT,
    "recipients" JSONB NOT NULL,
    "amounts" JSONB NOT NULL,
    "total_amount" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "distribution_transactions_prize_pool_id_fkey" FOREIGN KEY ("prize_pool_id") REFERENCES "prize_pools" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "prize_pools_hackathon_id_key" ON "prize_pools"("hackathon_id");

-- CreateIndex
CREATE INDEX "prize_pool_deposits_prize_pool_id_idx" ON "prize_pool_deposits"("prize_pool_id");

-- CreateIndex
CREATE INDEX "prize_pool_deposits_status_idx" ON "prize_pool_deposits"("status");

-- CreateIndex
CREATE INDEX "prize_pool_deposits_tx_hash_idx" ON "prize_pool_deposits"("tx_hash");

-- CreateIndex
CREATE INDEX "prize_distributions_prize_pool_id_idx" ON "prize_distributions"("prize_pool_id");

-- CreateIndex
CREATE INDEX "prize_distributions_hackathon_id_idx" ON "prize_distributions"("hackathon_id");

-- CreateIndex
CREATE INDEX "prize_distributions_status_idx" ON "prize_distributions"("status");

-- CreateIndex
CREATE INDEX "prize_distributions_tx_hash_idx" ON "prize_distributions"("tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_transactions_tx_hash_key" ON "distribution_transactions"("tx_hash");

-- CreateIndex
CREATE INDEX "distribution_transactions_hackathon_id_idx" ON "distribution_transactions"("hackathon_id");

-- CreateIndex
CREATE INDEX "distribution_transactions_status_idx" ON "distribution_transactions"("status");

-- CreateIndex
CREATE INDEX "distribution_transactions_submitted_at_idx" ON "distribution_transactions"("submitted_at");
