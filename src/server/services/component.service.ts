import "server-only";

import { prisma } from "@/server/db/prisma";
import {
  recordAudit,
  serializeCandidate,
  serializeComponent,
  store,
  useDatabase,
} from "@/server/services/store.shared";
import type { ComponentRecord } from "@/types/domain";

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
