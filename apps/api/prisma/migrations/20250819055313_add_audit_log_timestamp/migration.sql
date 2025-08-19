/*
  Warnings:

  - You are about to alter the column `metadata` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hackathon_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "user_address" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_user_address_fkey" FOREIGN KEY ("user_address") REFERENCES "user_profiles" ("wallet_address") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("action", "created_at", "from_status", "hackathon_id", "id", "ip_address", "metadata", "reason", "to_status", "triggered_by", "user_address", "user_agent") SELECT "action", "created_at", "from_status", "hackathon_id", "id", "ip_address", "metadata", "reason", "to_status", "triggered_by", "user_address", "user_agent" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE INDEX "audit_logs_hackathon_id_idx" ON "audit_logs"("hackathon_id");
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_triggered_by_idx" ON "audit_logs"("triggered_by");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
