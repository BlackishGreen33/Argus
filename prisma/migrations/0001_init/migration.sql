CREATE TYPE "TriageStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DEFERRED', 'FALSE_POSITIVE');
CREATE TYPE "CandidateStatus" AS ENUM ('CANDIDATE', 'CONFIRMED', 'REJECTED');
CREATE TYPE "ImportStatus" AS ENUM ('QUEUED', 'RUNNING', 'PREVIEW_READY', 'MERGING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "Cve" (
  "id" TEXT NOT NULL,
  "cveId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceName" TEXT,
  "sourcePublishDate" TIMESTAMP(3),
  "sourceUpdateDate" TIMESTAMP(3),
  "sourceLink" TEXT,
  "title" TEXT,
  "description" TEXT,
  "affectedVersions" JSONB,
  "cvssScoreV4" DOUBLE PRECISION,
  "cvssScoreV3" DOUBLE PRECISION,
  "cvssScoreV2" DOUBLE PRECISION,
  "severity" TEXT,
  "type" TEXT,
  "cweIds" JSONB,
  "triageStatus" "TriageStatus" NOT NULL DEFAULT 'PENDING',
  "sourceMissing" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cve_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Cve_cveId_key" ON "Cve"("cveId");
CREATE UNIQUE INDEX "Cve_sourceId_key" ON "Cve"("sourceId");
CREATE INDEX "Cve_severity_idx" ON "Cve"("severity");
CREATE INDEX "Cve_triageStatus_idx" ON "Cve"("triageStatus");
CREATE INDEX "Cve_sourceUpdateDate_idx" ON "Cve"("sourceUpdateDate");

CREATE TABLE "Component" (
  "purl" TEXT NOT NULL,
  "cpe" TEXT,
  "type" TEXT,
  "vendor" TEXT,
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "license" TEXT,
  "description" TEXT,
  "repository" TEXT,
  "publishDate" TIMESTAMP(3),
  "language" TEXT,
  "recordTime" TIMESTAMP(3),
  "sourceMissing" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Component_pkey" PRIMARY KEY ("purl")
);
CREATE INDEX "Component_name_idx" ON "Component"("name");
CREATE INDEX "Component_type_idx" ON "Component"("type");
CREATE INDEX "Component_cpe_idx" ON "Component"("cpe");

CREATE TABLE "CpeCandidate" (
  "id" TEXT NOT NULL,
  "cveId" TEXT NOT NULL,
  "componentPurl" TEXT NOT NULL,
  "matchReason" TEXT NOT NULL,
  "status" "CandidateStatus" NOT NULL DEFAULT 'CANDIDATE',
  "confidence" DOUBLE PRECISION,
  "confirmedBy" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CpeCandidate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CpeCandidate_cveId_componentPurl_key" ON "CpeCandidate"("cveId", "componentPurl");
CREATE INDEX "CpeCandidate_status_idx" ON "CpeCandidate"("status");
ALTER TABLE "CpeCandidate" ADD CONSTRAINT "CpeCandidate_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "Cve"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CpeCandidate" ADD CONSTRAINT "CpeCandidate_componentPurl_fkey" FOREIGN KEY ("componentPurl") REFERENCES "Component"("purl") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorEmail" TEXT,
  "targetType" TEXT,
  "targetId" TEXT,
  "cveId" TEXT,
  "componentPurl" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");
CREATE INDEX "AuditEvent_cveId_createdAt_idx" ON "AuditEvent"("cveId", "createdAt");
CREATE INDEX "AuditEvent_componentPurl_createdAt_idx" ON "AuditEvent"("componentPurl", "createdAt");
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "Cve"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_componentPurl_fkey" FOREIGN KEY ("componentPurl") REFERENCES "Component"("purl") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ImportJob" (
  "id" TEXT NOT NULL,
  "dataset" TEXT NOT NULL DEFAULT 'comp.sql + vul.sql',
  "status" "ImportStatus" NOT NULL DEFAULT 'QUEUED',
  "sourceChecksum" TEXT,
  "summary" JSONB,
  "sampleDiffs" JSONB,
  "errorMessage" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ImportJob_status_createdAt_idx" ON "ImportJob"("status", "createdAt");

CREATE TABLE "ImportStageRow" (
  "id" TEXT NOT NULL,
  "importJobId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "stableKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportStageRow_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ImportStageRow_importJobId_entityType_stableKey_key" ON "ImportStageRow"("importJobId", "entityType", "stableKey");
ALTER TABLE "ImportStageRow" ADD CONSTRAINT "ImportStageRow_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
