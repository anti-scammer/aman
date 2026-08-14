-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scamCategory" TEXT NOT NULL,
    "reporterName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "summaryAr" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "questionAr" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "correctOptionId" TEXT NOT NULL,
    "explanationAr" TEXT NOT NULL,
    "explanationEn" TEXT NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckLog" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckLog_pkey" PRIMARY KEY ("id")
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

