import type { ImportJob, TriageStatus } from "@/types/domain";

export const statusLabelKeys: Record<TriageStatus, string> = {
  PENDING: "status.pending",
  CONFIRMED: "status.confirmed",
  DEFERRED: "status.deferred",
  FALSE_POSITIVE: "status.falsePositive",
};

export const severityLabelKeys: Record<string, string> = {
  CRITICAL: "severity.critical",
  HIGH: "severity.high",
  MEDIUM: "severity.medium",
  LOW: "severity.low",
};

export const importStatusLabelKeys: Record<ImportJob["status"], string> = {
  QUEUED: "status.queued",
  RUNNING: "status.running",
  PREVIEW_READY: "status.previewReady",
  MERGING: "status.merging",
  SUCCEEDED: "status.succeeded",
  FAILED: "status.failed",
};
