import "server-only";

import { $Enums, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  type CveFilters,
  recordAudit,
  serializeCve,
  sortCves,
  store,
  useDatabase,
} from "@/server/services/store.shared";
import type { CveRecord, TriageStatus } from "@/types/domain";

export async function listCves(filters: CveFilters = {}) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 10, 1), 5000);
  const query = filters.query?.trim().toLowerCase();

  if (useDatabase) {
    const conditions: Prisma.CveWhereInput[] = [];
    if (filters.query) {
      conditions.push({
        OR: [
          { cveId: { contains: filters.query, mode: "insensitive" } },
          { title: { contains: filters.query, mode: "insensitive" } },
          { description: { contains: filters.query, mode: "insensitive" } },
          { candidates: { some: { component: { name: { contains: filters.query, mode: "insensitive" } } } } },
        ],
      });
    }
    if (filters.severity) conditions.push({ severity: filters.severity });
    if (filters.status) conditions.push({ triageStatus: filters.status as $Enums.TriageStatus });
    if (filters.ecosystem) {
      conditions.push({ candidates: { some: { componentPurl: { startsWith: `pkg:${filters.ecosystem}/` } } } });
    }
    const where: Prisma.CveWhereInput = conditions.length ? { AND: conditions } : {};
    const summaries = await prisma.cve.findMany({
      where,
      select: { id: true, severity: true, cvssScoreV3: true, cvssScoreV4: true },
    });
    const rank = (severity?: string | null) => ({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 })[severity ?? ""] ?? 0;
    const ordered = summaries.sort(
      (a, b) =>
        rank(b.severity) - rank(a.severity) ||
        (b.cvssScoreV3 ?? b.cvssScoreV4 ?? 0) - (a.cvssScoreV3 ?? a.cvssScoreV4 ?? 0),
    );
    const pageIds = ordered.slice((page - 1) * pageSize, page * pageSize).map((record) => record.id);
    if (!pageIds.length) return { data: [], total: ordered.length, page, pageSize };
    const pageRecords = await prisma.cve.findMany({
      where: { id: { in: pageIds } },
      include: { candidates: { include: { component: true } } },
    });
    const byId = new Map(pageRecords.map((record) => [record.id, serializeCve(record)]));
    return {
      data: pageIds.flatMap((id) => {
        const record = byId.get(id);
        return record ? [record] : [];
      }),
      total: ordered.length,
      page,
      pageSize,
    };
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
  if (useDatabase) {
    const records = await prisma.cve.findMany({ where: { cveId: { in: cveIds } }, select: { id: true, cveId: true } });
    const foundIds = records.map((record) => record.cveId);
    await prisma.$transaction(async (tx) => {
      await tx.cve.updateMany({ where: { cveId: { in: foundIds } }, data: { triageStatus: status } });
      if (records.length) {
        await tx.auditEvent.createMany({
          data: records.map((record) => ({
            action: "STATUS_CHANGED",
            actorEmail,
            targetType: "CVE",
            targetId: record.cveId,
            cveId: record.id,
            metadata: { status },
          })),
        });
      }
      await tx.auditEvent.create({
        data: { action: "BATCH_STATUS_CHANGED", actorEmail, targetType: "CVE", metadata: { cveIds, status } },
      });
    });
    return Promise.all(foundIds.map((cveId) => getCve(cveId))).then((items) => items.filter(Boolean) as CveRecord[]);
  }

  const updated: CveRecord[] = [];
  for (const cveId of cveIds) {
    const record = await updateStatus(cveId, status, actorEmail);
    if (record) updated.push(record);
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
