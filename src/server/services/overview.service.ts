import "server-only";

import { prisma } from "@/server/db/prisma";
import { listCves } from "@/server/services/cve.service";
import { getImportJob } from "@/server/services/import.service";
import { store, useDatabase } from "@/server/services/store.shared";
import type { OverviewData } from "@/types/domain";

export async function overview(): Promise<OverviewData> {
  const data = useDatabase
    ? await prisma.cve.findMany({
        select: {
          severity: true,
          triageStatus: true,
          candidates: { select: { componentPurl: true } },
        },
      })
    : (await listCves({ page: 1, pageSize: 5000 })).data;
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
