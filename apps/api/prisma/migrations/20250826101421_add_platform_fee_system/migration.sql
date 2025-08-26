-- CreateTable
CREATE TABLE "platform_fee_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "old_fee_rate" INTEGER NOT NULL,
    "new_fee_rate" INTEGER NOT NULL,
    "changed_by" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "platform_fee_collections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hackathon_id" TEXT NOT NULL,
    "prize_pool_id" INTEGER NOT NULL,
    "fee_amount" TEXT NOT NULL,
    "fee_rate" INTEGER NOT NULL,
    "token_address" TEXT,
    "recipient_address" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "block_number" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "collected_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" DATETIME,
    CONSTRAINT "platform_fee_collections_prize_pool_id_fkey" FOREIGN KEY ("prize_pool_id") REFERENCES "prize_pools" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_prize_pools" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hackathon_id" TEXT NOT NULL,
    "total_amount" TEXT NOT NULL,
    "contract_pool_id" TEXT,
    "contract_address" TEXT,
    "is_deposited" BOOLEAN NOT NULL DEFAULT false,
    "deposit_tx_hash" TEXT,
    "is_distributed" BOOLEAN NOT NULL DEFAULT false,
    "distribution_tx_hash" TEXT,
    "locked_fee_rate" INTEGER NOT NULL DEFAULT 250,
    "token_address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "prize_pools_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_prize_pools" ("contract_address", "contract_pool_id", "created_at", "deposit_tx_hash", "distribution_tx_hash", "hackathon_id", "id", "is_deposited", "is_distributed", "total_amount", "updated_at") SELECT "contract_address", "contract_pool_id", "created_at", "deposit_tx_hash", "distribution_tx_hash", "hackathon_id", "id", "is_deposited", "is_distributed", "total_amount", "updated_at" FROM "prize_pools";
DROP TABLE "prize_pools";
ALTER TABLE "new_prize_pools" RENAME TO "prize_pools";
CREATE UNIQUE INDEX "prize_pools_hackathon_id_key" ON "prize_pools"("hackathon_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "platform_fee_history_created_at_idx" ON "platform_fee_history"("created_at");

-- CreateIndex
CREATE INDEX "platform_fee_collections_hackathon_id_idx" ON "platform_fee_collections"("hackathon_id");

-- CreateIndex
CREATE INDEX "platform_fee_collections_prize_pool_id_idx" ON "platform_fee_collections"("prize_pool_id");

-- CreateIndex
CREATE INDEX "platform_fee_collections_status_idx" ON "platform_fee_collections"("status");

-- CreateIndex
CREATE INDEX "platform_fee_collections_collected_at_idx" ON "platform_fee_collections"("collected_at");

-- CreateIndex
CREATE INDEX "platform_fee_collections_tx_hash_idx" ON "platform_fee_collections"("tx_hash");
