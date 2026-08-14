-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scamCategory" TEXT NOT NULL,
    "reporterName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "summaryAr" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionAr" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "correctOptionId" TEXT NOT NULL,
    "explanationAr" TEXT NOT NULL,
    "explanationEn" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CheckLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Report_normalizedValue_idx" ON "Report"("normalizedValue");

-- CreateIndex
CREATE INDEX "Report_status_type_idx" ON "Report"("status", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "CheckLog_normalizedValue_idx" ON "CheckLog"("normalizedValue");

-- CreateIndex
CREATE INDEX "CheckLog_kind_verdict_createdAt_idx" ON "CheckLog"("kind", "verdict", "createdAt");
