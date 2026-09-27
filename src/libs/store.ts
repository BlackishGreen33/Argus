import { randomUUID } from "node:crypto";

import type {
  AuditEvent,
  ComponentRecord,
  CpeCandidate,
  CveRecord,
  ImportJob,
  OverviewData,
  TriageStatus,
} from "@/types/domain";

import { demoComponents, demoCves } from "./demo-data";
import { findCandidateComponents, loadSourceData, type ParsedComponent, type ParsedCve } from "./parser";
import { prisma } from "./prisma";
import { importWorkerUrl, qstash } from "./qstash";

type CveFilters = {
  query?: string;
  severity?: string;
  status?: string;
  ecosystem?: string;
  page?: number;
  pageSize?: number;
};

type StoreState = {
  cves: CveRecord[];
  components: ComponentRecord[];
  auditEvents: AuditEvent[];
  imports: ImportJob[];
};

const globalStore = globalThis as unknown as { argusStore?: StoreState };
const store: StoreState = globalStore.argusStore ?? {
  cves: structuredClone(demoCves),
  components: structuredClone(demoComponents),
  auditEvents: [],
  imports: [],
};
if (process.env.NODE_ENV !== "production") globalStore.argusStore = store;

export const useDatabase = Boolean(process.env.DATABASE_URL) && process.env.DEMO_MODE === "false";

function safeArray(value: unknown): string[] {
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

function sortCves(list: CveRecord[]) {
  return [...list].sort((a, b) => {
    const severity = severityRank(b.severity) - severityRank(a.severity);
    if (severity) return severity;
    return (b.cvssScoreV3 ?? b.cvssScoreV4 ?? 0) - (a.cvssScoreV3 ?? a.cvssScoreV4 ?? 0);
  });
}

function serializeCandidate(candidate: any): CpeCandidate {
  return {
    id: candidate.id,
    componentPurl: candidate.componentPurl,
    componentName: candidate.component?.name
      ? `${candidate.component.vendor ?? ""} ${candidate.component.name}`.trim()
      : candidate.componentPurl,
    cpe: candidate.component?.cpe,
    matchReason: candidate.matchReason,
    status: candidate.status,
    confidence: candidate.confidence,
  };
}

function serializeCve(record: any): CveRecord {
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

function serializeComponent(record: any): ComponentRecord {
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

function serializeImportJob(record: any): ImportJob {
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

function recordAudit(input: Omit<AuditEvent, "id" | "createdAt">) {
  const event: AuditEvent = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
  store.auditEvents.unshift(event);
  return event;
}

export async function listCves(filters: CveFilters = {}) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 10, 1), 5000);
  const query = filters.query?.trim().toLowerCase();

  if (useDatabase) {
    const records = await prisma.cve.findMany({
      include: {
        candidates: { include: { component: true } },
        auditEvents: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    const data = sortCves(records.map(serializeCve)).filter((record) => {
      const haystack = [
        record.cveId,
        record.title,
        record.description,
        ...record.candidates.map((item) => item.componentName),
      ]
        .join(" ")
        .toLowerCase();
      const ecosystemMatches =
        !filters.ecosystem ||
        record.candidates.some((item) => item.componentPurl.startsWith(`pkg:${filters.ecosystem}/`));
      return (
        (!query || haystack.includes(query)) &&
        (!filters.severity || record.severity === filters.severity) &&
        (!filters.status || record.triageStatus === filters.status) &&
        ecosystemMatches
      );
    });
    return { data: data.slice((page - 1) * pageSize, page * pageSize), total: data.length, page, pageSize };
  }

  const data = sortCves(store.cves).filter((record) => {
    const haystack = [
      record.cveId,
      record.title,
      record.description,
      ...record.candidates.map((item) => item.componentName),
    ]
      .join(" ")
      .toLowerCase();
    const ecosystemMatches =
      !filters.ecosystem ||
      record.candidates.some((item) => item.componentPurl.startsWith(`pkg:${filters.ecosystem}/`));
    return (
      (!query || haystack.includes(query)) &&
      (!filters.severity || record.severity === filters.severity) &&
      (!filters.status || record.triageStatus === filters.status) &&
      ecosystemMatches
    );
  });
  return { data: data.slice((page - 1) * pageSize, page * pageSize), total: data.length, page, pageSize };
}

export async function getCve(cveId: string) {
  if (useDatabase) {
    const record = await prisma.cve.findUnique({
      where: { cveId },
      include: {
        candidates: { include: { component: true } },
        auditEvents: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    });
    return record ? serializeCve(record) : null;
  }
  return store.cves.find((record) => record.cveId === cveId) ?? null;
}

export async function updateCve(
  cveId: string,
  patch: Partial<
    Pick<
      CveRecord,
      | "title"
      | "description"
      | "severity"
      | "cvssScoreV3"
      | "cvssScoreV4"
      | "cvssScoreV2"
      | "affectedVersions"
      | "cweIds"
    >
  >,
  actorEmail: string,
) {
  if (useDatabase) {
    const data = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    const record = await prisma.cve.update({
      where: { cveId },
      data: data as any,
      include: { candidates: { include: { component: true } }, auditEvents: true },
    });
    await prisma.auditEvent.create({
      data: {
        action: "CVE_UPDATED",
        actorEmail,
        targetType: "CVE",
        targetId: cveId,
        cveId: record.id,
        metadata: { fields: Object.keys(patch) },
      },
    });
    return serializeCve(record);
  }

  const record = store.cves.find((item) => item.cveId === cveId);
  if (!record) return null;
  Object.assign(record, patch);
  const event = recordAudit({
    action: "CVE_UPDATED",
    actorEmail,
    targetType: "CVE",
    targetId: cveId,
    cveId: record.id,
    metadata: { fields: Object.keys(patch) },
  });
  record.history.unshift(event);
  return record;
}

export async function updateStatus(cveId: string, status: TriageStatus, actorEmail: string) {
  const record = await getCve(cveId);
  if (!record) return null;
  const previous = record.triageStatus;

  if (useDatabase) {
    const updated = await prisma.cve.update({
      where: { cveId },
      data: { triageStatus: status },
      include: {
        candidates: { include: { component: true } },
        auditEvents: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    });
    await prisma.auditEvent.create({
      data: {
        action: "STATUS_CHANGED",
        actorEmail,
        targetType: "CVE",
        targetId: cveId,
        cveId: updated.id,
        metadata: { from: previous, status },
      },
    });
    return serializeCve(updated);
  }

  record.triageStatus = status;
  const event = recordAudit({
    action: "STATUS_CHANGED",
    actorEmail,
    targetType: "CVE",
    targetId: cveId,
    cveId: record.id,
    metadata: { from: previous, status },
  });
  record.history.unshift(event);
  return record;
}

export async function batchUpdateStatus(cveIds: string[], status: TriageStatus, actorEmail: string) {
  const updated: CveRecord[] = [];
  for (const cveId of cveIds) {
    const record = await updateStatus(cveId, status, actorEmail);
    if (record) updated.push(record);
  }
  if (useDatabase) {
    await prisma.auditEvent.create({
      data: { action: "BATCH_STATUS_CHANGED", actorEmail, targetType: "CVE", metadata: { cveIds, status } },
    });
  }
  recordAudit({ action: "BATCH_STATUS_CHANGED", actorEmail, targetType: "CVE", metadata: { cveIds, status } });
  return updated;
}

export async function deleteCve(cveId: string, actorEmail: string) {
  const record = await getCve(cveId);
  if (!record) return false;
  if (useDatabase) {
    await prisma.auditEvent.create({
      data: {
        action: "CVE_DELETED",
        actorEmail,
        targetType: "CVE",
        targetId: cveId,
        metadata: { sourceId: record.sourceId },
      },
    });
    await prisma.cve.delete({ where: { cveId } });
    return true;
  }
  store.cves = store.cves.filter((item) => item.cveId !== cveId);
  recordAudit({
    action: "CVE_DELETED",
    actorEmail,
    targetType: "CVE",
    targetId: cveId,
    metadata: { sourceId: record.sourceId },
  });
  return true;
}

export async function listComponents(query = "") {
  if (useDatabase) {
    const records = await prisma.component.findMany({ orderBy: { name: "asc" } });
    return records
      .map(serializeComponent)
      .filter((item) => `${item.purl} ${item.name} ${item.vendor ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  }
  return store.components.filter((item) =>
    `${item.purl} ${item.name} ${item.vendor ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );
}

export async function createComponent(input: Omit<ComponentRecord, "sourceMissing">, actorEmail: string) {
  if (useDatabase) {
    const created = await prisma.component.create({
      data: {
        ...input,
        publishDate: input.publishDate ? new Date(input.publishDate) : null,
        recordTime: input.recordTime ? new Date(input.recordTime) : null,
      },
    });
    await prisma.auditEvent.create({
      data: {
        action: "COMPONENT_CREATED",
        actorEmail,
        targetType: "COMPONENT",
        targetId: input.purl,
        componentPurl: input.purl,
      },
    });
    return serializeComponent(created);
  }
  const component = { ...input, sourceMissing: false };
  store.components.unshift(component);
  recordAudit({
    action: "COMPONENT_CREATED",
    actorEmail,
    targetType: "COMPONENT",
    targetId: input.purl,
    componentPurl: input.purl,
  });
  return component;
}

export async function updateComponent(
  purl: string,
  input: Partial<Omit<ComponentRecord, "purl" | "sourceMissing">>,
  actorEmail: string,
) {
  if (useDatabase) {
    const updated = await prisma.component.update({
      where: { purl },
      data: {
        ...input,
        publishDate: input.publishDate ? new Date(input.publishDate) : undefined,
        recordTime: input.recordTime ? new Date(input.recordTime) : undefined,
      },
    });
    await prisma.auditEvent.create({
      data: {
        action: "COMPONENT_UPDATED",
        actorEmail,
        targetType: "COMPONENT",
        targetId: purl,
        componentPurl: purl,
        metadata: { fields: Object.keys(input) },
      },
    });
    return serializeComponent(updated);
  }
  const component = store.components.find((item) => item.purl === purl);
  if (!component) return null;
  Object.assign(component, input);
  recordAudit({
    action: "COMPONENT_UPDATED",
    actorEmail,
    targetType: "COMPONENT",
    targetId: purl,
    componentPurl: purl,
    metadata: { fields: Object.keys(input) },
  });
  return component;
}

export async function deleteComponent(purl: string, actorEmail: string) {
  if (useDatabase) {
    const exists = await prisma.component.findUnique({ where: { purl }, select: { purl: true } });
    if (!exists) return false;
    await prisma.auditEvent.create({
      data: { action: "COMPONENT_DELETED", actorEmail, targetType: "COMPONENT", targetId: purl, componentPurl: purl },
    });
    await prisma.component.delete({ where: { purl } });
    return true;
  }
  const exists = store.components.some((item) => item.purl === purl);
  store.components = store.components.filter((item) => item.purl !== purl);
  recordAudit({
    action: "COMPONENT_DELETED",
    actorEmail,
    targetType: "COMPONENT",
    targetId: purl,
    componentPurl: purl,
  });
  return exists;
}

export async function updateCandidate(id: string, status: "CONFIRMED" | "REJECTED", actorEmail: string) {
  if (useDatabase) {
    const candidate = await prisma.cpeCandidate.update({
      where: { id },
      data: { status, confirmedBy: actorEmail, confirmedAt: new Date() },
      include: { component: true },
    });
    await prisma.auditEvent.create({
      data: {
        action: "CPE_CANDIDATE_REVIEWED",
        actorEmail,
        targetType: "CPE_CANDIDATE",
        targetId: id,
        cveId: candidate.cveId,
        componentPurl: candidate.componentPurl,
        metadata: { status },
      },
    });
    return serializeCandidate(candidate);
  }
  const candidate = store.cves.flatMap((item) => item.candidates).find((item) => item.id === id);
  if (!candidate) return null;
  candidate.status = status;
  recordAudit({
    action: "CPE_CANDIDATE_REVIEWED",
    actorEmail,
    targetType: "CPE_CANDIDATE",
    targetId: id,
    metadata: { status },
  });
  return candidate;
}

export async function overview(): Promise<OverviewData> {
  const { data } = await listCves({ page: 1, pageSize: 5000 });
  const severity = ["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((name) => ({
    name,
    count: data.filter((item) => item.severity === name).length,
  }));
  const ecosystemMap = new Map<string, number>();
  data.forEach((item) =>
    item.candidates.forEach((candidate) => {
      const ecosystem = candidate.componentPurl.split(":")[1]?.split("/")[0] ?? "other";
      ecosystemMap.set(ecosystem, (ecosystemMap.get(ecosystem) ?? 0) + 1);
    }),
  );
  const ecosystems = [...ecosystemMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const riskWeights: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const open = data.filter((item) => item.triageStatus === "PENDING" || item.triageStatus === "DEFERRED");
  const max = Math.max(data.length * 4, 1);
  const riskIndex = Math.round(
    (open.reduce((sum, item) => sum + (riskWeights[item.severity ?? "LOW"] ?? 0), 0) / max) * 100,
  );
  return {
    severity,
    ecosystems,
    openCritical: open.filter((item) => item.severity === "CRITICAL").length,
    openHigh: open.filter((item) => item.severity === "HIGH").length,
    riskIndex,
    latestImport: useDatabase ? await getImportJob() : (store.imports[0] ?? null),
  };
}

function makeImport(status: ImportJob["status"], actorEmail: string): ImportJob {
  return {
    id: randomUUID(),
    dataset: "comp.sql + vul.sql",
    status,
    retryCount: 0,
    createdBy: actorEmail,
    createdAt: new Date().toISOString(),
  };
}

function parseSourceArray(value: string | null) {
  return safeArray(value);
}

function parseSourceDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function componentSourceData(source: ParsedComponent) {
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

function cveSourceData(source: ParsedCve) {
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

function componentMemoryData(source: ParsedComponent): ComponentRecord {
  return {
    purl: source.purl,
    ...componentSourceData(source),
    publishDate: source.publishDate,
    recordTime: source.recordTime,
  };
}

function cveMemoryData(source: ParsedCve) {
  return {
    ...cveSourceData(source),
    sourcePublishDate: source.sourcePublishDate,
    sourceUpdateDate: source.sourceUpdateDate,
  };
}

function importSummary(source: Awaited<ReturnType<typeof loadSourceData>>) {
  const candidates = source.cves.reduce(
    (count, cve) => count + findCandidateComponents(cve, source.components).length,
    0,
  );
  return { components: source.components.length, cves: source.cves.length, candidates };
}

async function enqueueImport(id: string, actorEmail: string) {
  if (!useDatabase) {
    await prepareImportJob(id, actorEmail);
    return;
  }
  const url = importWorkerUrl();
  if (qstash && url) {
    try {
      await qstash.publishJSON({ url, body: { jobId: id, actorEmail }, retries: 3 });
      return;
    } catch {
      // Fall back to the local worker when QStash is unavailable during a demo.
    }
  }
  await prepareImportJob(id, actorEmail);
}

export async function createImportJob(actorEmail: string) {
  if (useDatabase) {
    const record = await prisma.importJob.create({ data: { createdBy: actorEmail } });
    const job = serializeImportJob(record);
    await prisma.auditEvent.create({
      data: {
        action: "IMPORT_QUEUED",
        actorEmail,
        targetType: "IMPORT_JOB",
        targetId: job.id,
        metadata: { dataset: job.dataset },
      },
    });
    await enqueueImport(job.id, actorEmail);
    return job;
  }
  const job = makeImport("QUEUED", actorEmail);
  store.imports.unshift(job);
  recordAudit({ action: "IMPORT_QUEUED", actorEmail, targetType: "IMPORT_JOB", targetId: job.id });
  await enqueueImport(job.id, actorEmail);
  return job;
}

export async function prepareImportJob(id: string, actorEmail: string) {
  if (useDatabase) {
    const existing = await prisma.importJob.findUnique({ where: { id } });
    if (!existing) return null;
    await prisma.importJob.update({
      where: { id },
      data: { status: "RUNNING", startedAt: new Date(), errorMessage: null },
    });
    try {
      const source = await loadSourceData();
      const summary = importSummary(source);
      const sampleDiffs = [
        { entity: "CVE", key: source.cves[0]?.cveId ?? "n/a", change: "来源资料可供预览" },
        { entity: "Component", key: source.components[0]?.purl ?? "n/a", change: "来源资料可供预览" },
      ];
      const rows = [
        ...source.components.map((item) => ({
          importJobId: id,
          entityType: "COMPONENT",
          stableKey: item.purl,
          payload: item as unknown as object,
        })),
        ...source.cves.map((item) => ({
          importJobId: id,
          entityType: "CVE",
          stableKey: item.cveId,
          payload: item as unknown as object,
        })),
      ];
      await prisma.$transaction(async (tx) => {
        await tx.importStageRow.deleteMany({ where: { importJobId: id } });
        if (rows.length) await tx.importStageRow.createMany({ data: rows as any });
        await tx.importJob.update({
          where: { id },
          data: { sourceChecksum: source.checksum, summary, sampleDiffs, status: "PREVIEW_READY" },
        });
      });
      await prisma.auditEvent.create({
        data: { action: "IMPORT_PREVIEW_READY", actorEmail, targetType: "IMPORT_JOB", targetId: id, metadata: summary },
      });
      return serializeImportJob(await prisma.importJob.findUniqueOrThrow({ where: { id } }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Import failed";
      await prisma.importJob.update({
        where: { id },
        data: { status: "FAILED", errorMessage, finishedAt: new Date() },
      });
      await prisma.auditEvent.create({
        data: {
          action: "IMPORT_FAILED",
          actorEmail,
          targetType: "IMPORT_JOB",
          targetId: id,
          metadata: { error: errorMessage },
        },
      });
      return serializeImportJob(await prisma.importJob.findUniqueOrThrow({ where: { id } }));
    }
  }
  const job = store.imports.find((item) => item.id === id);
  if (!job) return null;
  job.status = "RUNNING";
  job.startedAt = new Date().toISOString();
  try {
    const source = await loadSourceData();
    job.sourceChecksum = source.checksum;
    job.summary = importSummary(source);
    job.sampleDiffs = [
      { entity: "CVE", key: source.cves[0]?.cveId ?? "n/a", change: "来源资料可供预览" },
      { entity: "Component", key: source.components[0]?.purl ?? "n/a", change: "来源资料可供预览" },
    ];
    job.status = "PREVIEW_READY";
    recordAudit({
      action: "IMPORT_PREVIEW_READY",
      actorEmail,
      targetType: "IMPORT_JOB",
      targetId: id,
      metadata: job.summary,
    });
  } catch (error) {
    job.status = "FAILED";
    job.errorMessage = error instanceof Error ? error.message : "Import failed";
    job.finishedAt = new Date().toISOString();
    recordAudit({
      action: "IMPORT_FAILED",
      actorEmail,
      targetType: "IMPORT_JOB",
      targetId: id,
      metadata: { error: job.errorMessage },
    });
  }
  return job;
}

export async function getImportJob(id?: string) {
  if (useDatabase) {
    const record = id
      ? await prisma.importJob.findUnique({ where: { id } })
      : await prisma.importJob.findFirst({ orderBy: { createdAt: "desc" } });
    return record ? serializeImportJob(record) : null;
  }
  return id ? (store.imports.find((item) => item.id === id) ?? null) : (store.imports[0] ?? null);
}

export async function mergeImportJob(id: string, actorEmail: string) {
  if (useDatabase) {
    const job = await prisma.importJob.findUnique({ where: { id }, include: { stageRows: true } });
    if (!job) return null;
    const cveRows = job.stageRows.filter((row) => row.entityType === "CVE");
    const componentRows = job.stageRows.filter((row) => row.entityType === "COMPONENT");
    if (!cveRows.length && !componentRows.length) return serializeImportJob(job);
    await prisma.importJob.update({ where: { id }, data: { status: "MERGING" } });
    try {
      const cveKeys = cveRows.map((row) => row.stableKey);
      const componentKeys = componentRows.map((row) => row.stableKey);
      await prisma.$transaction(async (tx) => {
        const componentsByPurl = new Map<string, ParsedComponent>();
        for (const row of componentRows) {
          const source = row.payload as unknown as ParsedComponent;
          componentsByPurl.set(source.purl, source);
          await tx.component.upsert({
            where: { purl: source.purl },
            create: { purl: source.purl, ...componentSourceData(source) },
            update: componentSourceData(source),
          });
        }
        for (const row of cveRows) {
          const source = row.payload as unknown as ParsedCve;
          const saved = await tx.cve.upsert({
            where: { cveId: source.cveId },
            create: { cveId: source.cveId, ...cveSourceData(source) },
            update: cveSourceData(source),
          });
          for (const component of findCandidateComponents(source, [...componentsByPurl.values()])) {
            await tx.cpeCandidate.upsert({
              where: { cveId_componentPurl: { cveId: saved.id, componentPurl: component.purl } },
              create: {
                cveId: saved.id,
                componentPurl: component.purl,
                matchReason: "CPE vendor/name 前缀匹配，可能关联，需人工确认",
                confidence: 0.68,
              },
              update: { matchReason: "CPE vendor/name 前缀匹配，可能关联，需人工确认", confidence: 0.68 },
            });
          }
        }
        if (componentKeys.length) {
          await tx.component.updateMany({ where: { purl: { notIn: componentKeys } }, data: { sourceMissing: true } });
        }
        if (cveKeys.length) {
          await tx.cve.updateMany({ where: { cveId: { notIn: cveKeys } }, data: { sourceMissing: true } });
        }
        await tx.importJob.update({ where: { id }, data: { status: "SUCCEEDED", finishedAt: new Date() } });
      });
      await prisma.auditEvent.create({
        data: {
          action: "IMPORT_MERGED",
          actorEmail,
          targetType: "IMPORT_JOB",
          targetId: id,
          metadata: job.summary ?? {},
        },
      });
      return serializeImportJob(await prisma.importJob.findUniqueOrThrow({ where: { id } }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Merge failed";
      await prisma.importJob.update({
        where: { id },
        data: { status: "FAILED", errorMessage, finishedAt: new Date() },
      });
      await prisma.auditEvent.create({
        data: {
          action: "IMPORT_MERGE_FAILED",
          actorEmail,
          targetType: "IMPORT_JOB",
          targetId: id,
          metadata: { error: errorMessage },
        },
      });
      return serializeImportJob(await prisma.importJob.findUniqueOrThrow({ where: { id } }));
    }
  }
  const job = await getImportJob(id);
  if (!job) return null;
  job.status = "MERGING";
  const source = await loadSourceData();
  const sourceKeys = new Set(source.cves.map((item) => item.cveId));
  const componentKeys = new Set(source.components.map((item) => item.purl));
  const existingComponents = new Map(store.components.map((item) => [item.purl, item]));
  source.components.forEach((item) => {
    const existing = existingComponents.get(item.purl);
    if (existing) Object.assign(existing, componentMemoryData(item));
    else store.components.push(componentMemoryData(item));
  });
  store.components.forEach((item) => {
    item.sourceMissing = !componentKeys.has(item.purl);
  });
  const existingCves = new Map(store.cves.map((item) => [item.cveId, item]));
  source.cves.forEach((item) => {
    const existing = existingCves.get(item.cveId);
    const matchedCandidates = findCandidateComponents(item, source.components).map((component) => ({
      id: randomUUID(),
      componentPurl: component.purl,
      componentName: `${component.vendor ?? ""} ${component.name}`.trim(),
      cpe: component.cpe,
      matchReason: "CPE vendor/name 前缀匹配，可能关联，需人工确认",
      status: "CANDIDATE" as const,
      confidence: 0.68,
    }));
    if (existing) {
      const byPurl = new Map(existing.candidates.map((candidate) => [candidate.componentPurl, candidate]));
      matchedCandidates.forEach((candidate) => {
        if (!byPurl.has(candidate.componentPurl)) byPurl.set(candidate.componentPurl, candidate);
      });
      Object.assign(existing, {
        ...cveMemoryData(item),
        cveId: item.cveId,
        sourceId: item.sourceId,
        candidates: [...byPurl.values()],
      });
    } else {
      store.cves.push({
        id: randomUUID(),
        cveId: item.cveId,
        ...cveMemoryData(item),
        triageStatus: "PENDING",
        candidates: matchedCandidates,
        history: [],
      });
    }
  });
  store.cves.forEach((item) => {
    item.sourceMissing = !sourceKeys.has(item.cveId);
  });
  job.summary = importSummary(source);
  job.status = "SUCCEEDED";
  job.finishedAt = new Date().toISOString();
  recordAudit({
    action: "IMPORT_MERGED",
    actorEmail,
    targetType: "IMPORT_JOB",
    targetId: id,
    metadata: job.summary ?? {},
  });
  return job;
}

export async function retryImportJob(id: string, actorEmail: string) {
  if (useDatabase) {
    const job = await prisma.importJob.findUnique({ where: { id } });
    if (!job) return null;
    await prisma.importJob.update({
      where: { id },
      data: { retryCount: { increment: 1 }, status: "QUEUED", errorMessage: null },
    });
    await enqueueImport(id, actorEmail);
    return getImportJob(id);
  }
  const job = await getImportJob(id);
  if (!job) return null;
  job.retryCount += 1;
  job.errorMessage = null;
  return prepareImportJob(id, actorEmail);
}

export async function listAuditEvents() {
  if (useDatabase) {
    const events = await prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return events.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
      metadata: event.metadata as Record<string, unknown> | null,
    }));
  }
  return store.auditEvents.slice(0, 100);
}
