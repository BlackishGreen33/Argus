import { findCandidateComponents, loadSourceData } from "../src/libs/parser";
import { prisma, prismaPool } from "../src/libs/prisma";

function dateValue(value: string | null) {
  if (!value) return null;
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function arrayValue(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [value];
  } catch {
    return [value];
  }
}

async function runConcurrent<T>(tasks: Array<() => Promise<T>>, concurrency = 20) {
  const results: T[] = [];
  for (let index = 0; index < tasks.length; index += concurrency) {
    results.push(...(await Promise.all(tasks.slice(index, index + concurrency).map((task) => task()))));
  }
  return results;
}

async function main() {
  const source = await loadSourceData();
  const cveIds = new Map<string, string>();
  await runConcurrent(
    source.components.map(
      (item) => () =>
        prisma.component.upsert({
          where: { purl: item.purl },
          create: {
            purl: item.purl,
            cpe: item.cpe,
            type: item.type,
            vendor: item.vendor,
            name: item.name,
            version: item.version,
            license: item.license,
            description: item.description,
            repository: item.repository,
            publishDate: dateValue(item.publishDate),
            language: item.language,
            recordTime: dateValue(item.recordTime),
          },
          update: {
            cpe: item.cpe,
            type: item.type,
            vendor: item.vendor,
            name: item.name,
            version: item.version,
            license: item.license,
            description: item.description,
            repository: item.repository,
            publishDate: dateValue(item.publishDate),
            language: item.language,
            recordTime: dateValue(item.recordTime),
            sourceMissing: false,
          },
        }),
    ),
  );
  const savedCves = await runConcurrent(
    source.cves.map(
      (item) => () =>
        prisma.cve.upsert({
          where: { cveId: item.cveId },
          create: {
            cveId: item.cveId,
            sourceId: item.sourceId,
            sourceName: item.sourceName,
            sourcePublishDate: dateValue(item.sourcePublishDate),
            sourceUpdateDate: dateValue(item.sourceUpdateDate),
            sourceLink: item.sourceLink,
            affectedVersions: arrayValue(item.affectedVersion),
            cvssScoreV4: item.cvssScoreV4,
            cvssScoreV3: item.cvssScoreV3,
            cvssScoreV2: item.cvssScoreV2,
            severity: item.severity,
            type: item.type,
            cweIds: arrayValue(item.cweId),
          },
          update: {
            sourceId: item.sourceId,
            sourceName: item.sourceName,
            sourcePublishDate: dateValue(item.sourcePublishDate),
            sourceUpdateDate: dateValue(item.sourceUpdateDate),
            sourceLink: item.sourceLink,
            affectedVersions: arrayValue(item.affectedVersion),
            cvssScoreV4: item.cvssScoreV4,
            cvssScoreV3: item.cvssScoreV3,
            cvssScoreV2: item.cvssScoreV2,
            severity: item.severity,
            type: item.type,
            cweIds: arrayValue(item.cweId),
            sourceMissing: false,
          },
        }),
    ),
  );
  savedCves.forEach((saved) => cveIds.set(saved.cveId, saved.id));
  const candidateTasks: Array<() => Promise<unknown>> = [];
  for (const cve of source.cves) {
    const cveId = cveIds.get(cve.cveId);
    if (!cveId) continue;
    for (const component of findCandidateComponents(cve, source.components)) {
      candidateTasks.push(() =>
        prisma.cpeCandidate.upsert({
          where: { cveId_componentPurl: { cveId, componentPurl: component.purl } },
          create: {
            cveId,
            componentPurl: component.purl,
            matchReason: "CPE vendor/name 前缀匹配，可能关联，需人工确认",
            confidence: 0.68,
          },
          update: {
            matchReason: "CPE vendor/name 前缀匹配，可能关联，需人工确认",
            confidence: 0.68,
          },
        }),
      );
    }
  }
  await runConcurrent(candidateTasks);
  process.stdout.write(
    `Seeded ${source.components.length} components and ${source.cves.length} CVEs (${source.checksum}).\n`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await prismaPool.end();
  });
