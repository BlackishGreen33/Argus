import { CANDIDATE_STATUSES, SEVERITIES, TRIAGE_STATUSES } from "@/constants/status";

export { CANDIDATE_STATUSES, SEVERITIES, TRIAGE_STATUSES };
export type TriageStatus = (typeof TRIAGE_STATUSES)[number];
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];
export type Severity = (typeof SEVERITIES)[number];

export type CpeCandidate = {
  id: string;
  componentPurl: string;
  componentName: string;
  cpe?: string | null;
  matchReason: string;
  status: CandidateStatus;
  confidence?: number | null;
};

export type AuditEvent = {
  id: string;
  action: string;
  actorEmail?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  cveId?: string | null;
  componentPurl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type CveRecord = {
  id: string;
  cveId: string;
  sourceId: string;
  sourceName?: string | null;
  sourcePublishDate?: string | null;
  sourceUpdateDate?: string | null;
  sourceLink?: string | null;
  title?: string | null;
  description?: string | null;
  affectedVersions: string[];
  cvssScoreV4?: number | null;
  cvssScoreV3?: number | null;
  cvssScoreV2?: number | null;
  severity?: Severity | string | null;
  type?: string | null;
  cweIds: string[];
  triageStatus: TriageStatus;
  sourceMissing: boolean;
  candidates: CpeCandidate[];
  history: AuditEvent[];
};

export type ComponentRecord = {
  purl: string;
  cpe?: string | null;
  type?: string | null;
  vendor?: string | null;
  name: string;
  version: string;
  license?: string | null;
  description?: string | null;
  repository?: string | null;
  publishDate?: string | null;
  language?: string | null;
  recordTime?: string | null;
  sourceMissing: boolean;
};

export type ImportJob = {
  id: string;
  dataset: string;
  status: "QUEUED" | "RUNNING" | "PREVIEW_READY" | "MERGING" | "SUCCEEDED" | "FAILED";
  sourceChecksum?: string | null;
  summary?: Record<string, number> | null;
  sampleDiffs?: Array<Record<string, string>> | null;
  errorMessage?: string | null;
  retryCount: number;
  createdBy?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type OverviewData = {
  severity: Array<{ name: string; count: number }>;
  ecosystems: Array<{ name: string; count: number }>;
  openCritical: number;
  openHigh: number;
  riskIndex: number;
  latestImport: ImportJob | null;
};
