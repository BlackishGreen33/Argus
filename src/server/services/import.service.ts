import "server-only";

import { randomUUID } from "node:crypto";

import { serverMessages } from "@/i18n/server";
import { findCandidateComponents, loadSourceData, type ParsedComponent, type ParsedCve } from "@/server/data/parser";
import { prisma } from "@/server/db/prisma";
import { importWorkerUrl, qstash } from "@/server/jobs/qstash";
import { recordAudit, safeArray, serializeImportJob, store, useDatabase } from "@/server/services/store.shared";
import type { ComponentRecord, ImportJob } from "@/types/domain";

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
        {
          entity: "CVE",
          key: source.cves[0]?.cveId ?? serverMessages.import.notAvailable,
          change: serverMessages.import.previewReady,
        },
        {
          entity: "Component",
          key: source.components[0]?.purl ?? serverMessages.import.notAvailable,
          change: serverMessages.import.previewReady,
        },
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
      const errorMessage = error instanceof Error ? error.message : serverMessages.import.failed;
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
      {
        entity: "CVE",
        key: source.cves[0]?.cveId ?? serverMessages.import.notAvailable,
        change: serverMessages.import.previewReady,
      },
      {
        entity: "Component",
        key: source.components[0]?.purl ?? serverMessages.import.notAvailable,
        change: serverMessages.import.previewReady,
      },
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
    job.errorMessage = error instanceof Error ? error.message : serverMessages.import.failed;
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
    const claimed = await prisma.importJob.updateMany({
      where: { id, status: "PREVIEW_READY" },
      data: { status: "MERGING" },
    });
    if (claimed.count === 0) return serializeImportJob(await prisma.importJob.findUniqueOrThrow({ where: { id } }));
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
                matchReason: "triage.matchReasonPrefix",
                confidence: 0.68,
              },
              update: { matchReason: "triage.matchReasonPrefix", confidence: 0.68 },
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
      const errorMessage = error instanceof Error ? error.message : serverMessages.api.mergeFailed;
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
      matchReason: "triage.matchReasonPrefix",
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
