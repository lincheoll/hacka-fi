-- AlterTable
ALTER TABLE "votes" ADD COLUMN "comment" TEXT;

-- CreateTable
CREATE TABLE "hackathon_judges" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hackathon_id" TEXT NOT NULL,
    "judge_address" TEXT NOT NULL,
    "added_by" TEXT NOT NULL,
    "added_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hackathon_judges_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "hackathon_judges_judge_address_fkey" FOREIGN KEY ("judge_address") REFERENCES "user_profiles" ("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "hackathon_judges_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "user_profiles" ("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "hackathon_judges_hackathon_id_judge_address_key" ON "hackathon_judges"("hackathon_id", "judge_address");
