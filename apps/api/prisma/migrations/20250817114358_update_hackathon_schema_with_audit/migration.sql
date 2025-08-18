/*
  Warnings:

  - The primary key for the `hackathons` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `creator_address` on the `hackathons` table. All the data in the column will be lost.
  - You are about to drop the column `deadline` on the `hackathons` table. All the data in the column will be lost.
  - You are about to drop the column `lottery_percentage` on the `hackathons` table. All the data in the column will be lost.
  - Added the required column `organizer_address` to the `hackathons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registration_deadline` to the `hackathons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submission_deadline` to the `hackathons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `voting_deadline` to the `hackathons` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hackathon_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "user_address" TEXT,
    "metadata" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_user_address_fkey" FOREIGN KEY ("user_address") REFERENCES "user_profiles" ("wallet_address") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_hackathons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "organizer_address" TEXT NOT NULL,
    "registration_deadline" DATETIME NOT NULL,
    "submission_deadline" DATETIME NOT NULL,
    "voting_deadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "prize_amount" TEXT,
    "entry_fee" TEXT,
    "max_participants" INTEGER,
    "cover_image_url" TEXT,
    "contract_address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "hackathons_organizer_address_fkey" FOREIGN KEY ("organizer_address") REFERENCES "user_profiles" ("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_hackathons" ("contract_address", "created_at", "description", "id", "status", "title", "updated_at") SELECT "contract_address", "created_at", "description", "id", "status", "title", "updated_at" FROM "hackathons";
DROP TABLE "hackathons";
ALTER TABLE "new_hackathons" RENAME TO "hackathons";
CREATE TABLE "new_participants" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hackathon_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "submission_url" TEXT,
    "entry_fee" TEXT,
    "rank" INTEGER,
    "prize_amount" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "participants_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "participants_wallet_address_fkey" FOREIGN KEY ("wallet_address") REFERENCES "user_profiles" ("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_participants" ("created_at", "entry_fee", "hackathon_id", "id", "prize_amount", "rank", "submission_url", "updated_at", "wallet_address") SELECT "created_at", "entry_fee", "hackathon_id", "id", "prize_amount", "rank", "submission_url", "updated_at", "wallet_address" FROM "participants";
DROP TABLE "participants";
ALTER TABLE "new_participants" RENAME TO "participants";
CREATE UNIQUE INDEX "participants_hackathon_id_wallet_address_key" ON "participants"("hackathon_id", "wallet_address");
CREATE TABLE "new_results" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hackathon_id" TEXT NOT NULL,
    "winners" TEXT NOT NULL,
    "total_prize_pool" TEXT NOT NULL,
    "distribution_tx_hash" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "results_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_results" ("created_at", "distribution_tx_hash", "hackathon_id", "id", "total_prize_pool", "updated_at", "winners") SELECT "created_at", "distribution_tx_hash", "hackathon_id", "id", "total_prize_pool", "updated_at", "winners" FROM "results";
DROP TABLE "results";
ALTER TABLE "new_results" RENAME TO "results";
CREATE UNIQUE INDEX "results_hackathon_id_key" ON "results"("hackathon_id");
CREATE TABLE "new_user_achievements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_address" TEXT NOT NULL,
    "achievement_type" TEXT NOT NULL,
    "hackathon_id" TEXT,
    "rank" INTEGER,
    "prize_amount" TEXT,
    "earned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_achievements_user_address_fkey" FOREIGN KEY ("user_address") REFERENCES "user_profiles" ("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_achievements_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_achievements" ("achievement_type", "earned_at", "hackathon_id", "id", "prize_amount", "rank", "user_address") SELECT "achievement_type", "earned_at", "hackathon_id", "id", "prize_amount", "rank", "user_address" FROM "user_achievements";
DROP TABLE "user_achievements";
ALTER TABLE "new_user_achievements" RENAME TO "user_achievements";
CREATE TABLE "new_votes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hackathon_id" TEXT NOT NULL,
    "judge_address" TEXT NOT NULL,
    "participant_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "votes_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "votes_judge_address_fkey" FOREIGN KEY ("judge_address") REFERENCES "user_profiles" ("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "votes_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_votes" ("created_at", "hackathon_id", "id", "judge_address", "participant_id", "score", "updated_at") SELECT "created_at", "hackathon_id", "id", "judge_address", "participant_id", "score", "updated_at" FROM "votes";
DROP TABLE "votes";
ALTER TABLE "new_votes" RENAME TO "votes";
CREATE UNIQUE INDEX "votes_hackathon_id_judge_address_participant_id_key" ON "votes"("hackathon_id", "judge_address", "participant_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
