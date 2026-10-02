import "server-only";

import { randomUUID } from "node:crypto";

import { demoComponents, demoCves } from "@/server/data/demo-data";
import { findCandidateComponents, loadSourceData, type ParsedComponent, type ParsedCve } from "@/server/data/parser";
import type { AuditEvent, ComponentRecord, CpeCandidate, CveRecord, ImportJob } from "@/types/domain";

export type CveFilters = {
  query?: string;
  severity?: string;
  status?: string;
  ecosystem?: string;
  page?: number;
  pageSize?: number;
};

export type StoreState = {
  cves: CveRecord[];
  components: ComponentRecord[];
  auditEvents: AuditEvent[];
  imports: ImportJob[];
};

const globalStore = globalThis as unknown as { argusStore?: StoreState };
export const store: StoreState = globalStore.argusStore ?? {
  cves: structuredClone(demoCves),
  components: structuredClone(demoComponents),
  auditEvents: [],
  imports: [],
};
if (process.env.NODE_ENV !== "production") globalStore.argusStore = store;

export const useDatabase = Boolean(process.env.DATABASE_URL) && process.env.DEMO_MODE === "false";

export function safeArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [value];
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

function severityRank(value?: string | null) {
  return { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[value ?? ""] ?? 0;
}

export function sortCves(list: CveRecord[]) {
  return [...list].sort((a, b) => {
    const severity = severityRank(b.severity) - severityRank(a.severity);
    if (severity) return severity;
    return (b.cvssScoreV3 ?? b.cvssScoreV4 ?? 0) - (a.cvssScoreV3 ?? a.cvssScoreV4 ?? 0);
  });
}

export function serializeCandidate(candidate: any): CpeCandidate {
  return {
    id: candidate.id,
    componentPurl: candidate.componentPurl,
    componentName: candidate.component?.name
      ? `${candidate.component.vendor ?? ""} ${candidate.component.name}`.trim()
      : candidate.componentPurl,
    cpe: candidate.component?.cpe,
    matchReason: candidate.matchReason.startsWith("triage.") ? candidate.matchReason : "triage.matchReasonPrefix",
    status: candidate.status,
    confidence: candidate.confidence,
  };
}

export function serializeCve(record: any): CveRecord {
  return {
    id: record.id,
    cveId: record.cveId,
    sourceId: record.sourceId,
    sourceName: record.sourceName,
    sourcePublishDate: record.sourcePublishDate?.toISOString?.() ?? record.sourcePublishDate,
    sourceUpdateDate: record.sourceUpdateDate?.toISOString?.() ?? record.sourceUpdateDate,
    sourceLink: record.sourceLink,
    title: record.title,
    description: record.description,
    affectedVersions: safeArray(record.affectedVersions),
    cvssScoreV4: record.cvssScoreV4,
    cvssScoreV3: record.cvssScoreV3,
    cvssScoreV2: record.cvssScoreV2,
    severity: record.severity,
    type: record.type,
    cweIds: safeArray(record.cweIds),
    triageStatus: record.triageStatus,
    sourceMissing: record.sourceMissing,
    candidates: (record.candidates ?? []).map(serializeCandidate),
    history: (record.auditEvents ?? []).map((event: any) => ({
      id: event.id,
      action: event.action,
      actorEmail: event.actorEmail,
      targetType: event.targetType,
      targetId: event.targetId,
      cveId: event.cveId,
      componentPurl: event.componentPurl,
      metadata: event.metadata,
      createdAt: event.createdAt?.toISOString?.() ?? event.createdAt,
    })),
  };
}

export function serializeComponent(record: any): ComponentRecord {
  return {
    purl: record.purl,
    cpe: record.cpe,
    type: record.type,
    vendor: record.vendor,
    name: record.name,
    version: record.version,
    license: record.license,
    description: record.description,
    repository: record.repository,
    publishDate: record.publishDate?.toISOString?.() ?? record.publishDate,
    language: record.language,
    recordTime: record.recordTime?.toISOString?.() ?? record.recordTime,
    sourceMissing: record.sourceMissing,
  };
}

export function serializeImportJob(record: any): ImportJob {
  return {
    id: record.id,
    dataset: record.dataset,
    status: record.status,
    sourceChecksum: record.sourceChecksum,
    summary: record.summary,
    sampleDiffs: record.sampleDiffs,
    errorMessage: record.errorMessage,
    retryCount: record.retryCount,
    createdBy: record.createdBy,
    createdAt: record.createdAt?.toISOString?.() ?? record.createdAt,
    startedAt: record.startedAt?.toISOString?.() ?? record.startedAt,
    finishedAt: record.finishedAt?.toISOString?.() ?? record.finishedAt,
  };
}

export function recordAudit(input: Omit<AuditEvent, "id" | "createdAt">) {
  const event: AuditEvent = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
  store.auditEvents.unshift(event);
  return event;
}
function parseSourceArray(value: string | null) {
  return safeArray(value);
}

function parseSourceDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function componentSourceData(source: ParsedComponent) {
  return {
    cpe: source.cpe,
    type: source.type,
    vendor: source.vendor,
    name: source.name,
    version: source.version,
    license: source.license,
    description: source.description,
    repository: source.repository,
    publishDate: parseSourceDate(source.publishDate),
    language: source.language,
    recordTime: parseSourceDate(source.recordTime),
    sourceMissing: false,
  };
}

export function cveSourceData(source: ParsedCve) {
  return {
    sourceId: source.sourceId,
    sourceName: source.sourceName,
    sourcePublishDate: parseSourceDate(source.sourcePublishDate),
    sourceUpdateDate: parseSourceDate(source.sourceUpdateDate),
    sourceLink: source.sourceLink,
    title: source.title,
    description: source.description,
    affectedVersions: parseSourceArray(source.affectedVersion),
    cvssScoreV4: source.cvssScoreV4,
    cvssScoreV3: source.cvssScoreV3,
    cvssScoreV2: source.cvssScoreV2,
    severity: source.severity,
    type: source.type,
    cweIds: parseSourceArray(source.cweId),
    sourceMissing: false,
  };
}

export function componentMemoryData(source: ParsedComponent): ComponentRecord {
  return {
    purl: source.purl,
    ...componentSourceData(source),
    publishDate: source.publishDate,
    recordTime: source.recordTime,
  };
}

export function cveMemoryData(source: ParsedCve) {
  return {
    ...cveSourceData(source),
    sourcePublishDate: source.sourcePublishDate,
    sourceUpdateDate: source.sourceUpdateDate,
  };
}

export function importSummary(source: Awaited<ReturnType<typeof loadSourceData>>) {
  const candidates = source.cves.reduce(
    (count, cve) => count + findCandidateComponents(cve, source.components).length,
    0,
  );
  return { components: source.components.length, cves: source.cves.length, candidates };
}
