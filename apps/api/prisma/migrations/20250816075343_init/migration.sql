-- CreateTable
CREATE TABLE "user_profiles" (
    "wallet_address" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "hackathons" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "lottery_percentage" INTEGER NOT NULL DEFAULT 0,
    "contract_address" TEXT,
    "creator_address" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "hackathons_creator_address_fkey" FOREIGN KEY ("creator_address") REFERENCES "user_profiles" ("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "participants" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hackathon_id" INTEGER NOT NULL,
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

-- CreateTable
CREATE TABLE "votes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hackathon_id" INTEGER NOT NULL,
    "judge_address" TEXT NOT NULL,
    "participant_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "votes_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "votes_judge_address_fkey" FOREIGN KEY ("judge_address") REFERENCES "user_profiles" ("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "votes_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "results" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hackathon_id" INTEGER NOT NULL,
    "winners" TEXT NOT NULL,
    "total_prize_pool" TEXT NOT NULL,
    "distribution_tx_hash" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "results_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_address" TEXT NOT NULL,
    "achievement_type" TEXT NOT NULL,
    "hackathon_id" INTEGER,
    "rank" INTEGER,
    "prize_amount" TEXT,
    "earned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_achievements_user_address_fkey" FOREIGN KEY ("user_address") REFERENCES "user_profiles" ("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_achievements_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_username_key" ON "user_profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "participants_hackathon_id_wallet_address_key" ON "participants"("hackathon_id", "wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "votes_hackathon_id_judge_address_participant_id_key" ON "votes"("hackathon_id", "judge_address", "participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "results_hackathon_id_key" ON "results"("hackathon_id");
