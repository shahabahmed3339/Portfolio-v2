-- Additive migration: job-specific resume tailoring.
-- Creates three new tables only. No existing table, column or row is touched,
-- so this is safe to run against a database that already holds portfolio content.

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "jobUrl" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "slug" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "resumeJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "slug" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "Job_isArchived_idx" ON "Job"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeVersion_slug_key" ON "ResumeVersion"("slug");

-- CreateIndex
CREATE INDEX "ResumeVersion_jobId_version_idx" ON "ResumeVersion"("jobId", "version");

-- CreateIndex
CREATE INDEX "ResumeVersion_isPublished_idx" ON "ResumeVersion"("isPublished");

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;