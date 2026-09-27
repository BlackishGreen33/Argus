import type { ImportJob, TriageStatus } from "@/types/domain";

export const statusLabels: Record<TriageStatus, string> = {
  PENDING: "待处理",
  CONFIRMED: "已确认",
  DEFERRED: "已延后",
  FALSE_POSITIVE: "误报",
};

export const severityLabels: Record<string, string> = { CRITICAL: "严重", HIGH: "高", MEDIUM: "中", LOW: "低" };

export function importStatusLabel(status: ImportJob["status"]) {
  return {
    QUEUED: "排队中",
    RUNNING: "解析中",
    PREVIEW_READY: "等待合并",
    MERGING: "合并中",
    SUCCEEDED: "已完成",
    FAILED: "失败",
  }[status];
}
