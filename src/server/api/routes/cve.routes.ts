import "server-only";

import { serverMessages } from "@/i18n/server";
import { requireAdmin } from "@/server/api/helpers";
import { batchStatusSchema, cveListQuerySchema, cvePatchSchema } from "@/server/api/schemas";
import type { ApiApp } from "@/server/api/types";
import { invalidateCache, withCache } from "@/server/cache/redis";
import {
  batchUpdateStatus,
  deleteCve,
  getCve,
  listComponents,
  listCves,
  updateCve,
  updateStatus,
} from "@/server/services/store.service";

export function registerCveRoutes(app: ApiApp) {
  app.get("/cves", async (c) => {
    const parsed = cveListQuerySchema.safeParse({
      query: c.req.query("query"),
      severity: c.req.query("severity"),
      status: c.req.query("status"),
      ecosystem: c.req.query("ecosystem"),
      page: Number(c.req.query("page") ?? 1),
      pageSize: Number(c.req.query("pageSize") ?? 10),
    });
    if (!parsed.success) {
      return c.json({ ok: false, error: { message: serverMessages.api.invalidCveFields } }, 400);
    }
    const filters = parsed.data;
    const result = await withCache(["cves", new URL(c.req.url).searchParams.toString()], () => listCves(filters), 10);

    return c.json({ data: result.data, meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
  });

  app.get("/search", async (c) => {
    const query = c.req.query("query")?.trim();
    if (!query) return c.json({ data: [] });

    const result = await withCache(
      ["search", query],
      async () => {
        const [cves, components] = await Promise.all([
          listCves({ query, page: 1, pageSize: 8 }),
          listComponents(query),
        ]);
        return {
          data: [
            ...cves.data.slice(0, 8).map((item) => ({
              type: "CVE",
              label: item.cveId,
              sublabel: item.title ?? item.description ?? "",
              target: item.cveId,
            })),
            ...components
              .slice(0, 8)
              .map((item) => ({ type: "Component", label: item.name, sublabel: item.purl, target: item.purl })),
          ],
        };
      },
      10,
    );

    return c.json(result);
  });

  app.post("/cves/batch-status", async (c) => {
    const user = await requireAdmin(c);
    if (!user) return c.json({ ok: false, error: { message: serverMessages.api.adminLoginRequired } }, 403);

    const parsed = batchStatusSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ ok: false, error: { message: serverMessages.api.cveIdsStatusRequired } }, 400);
    }

    const data = await batchUpdateStatus(parsed.data.cveIds, parsed.data.status, user.email);
    await invalidateCache();
    return c.json({ data });
  });

  app.get("/cves/:cveId", async (c) => {
    const record = await getCve(c.req.param("cveId"));
    return record
      ? c.json({ data: record })
      : c.json({ ok: false, error: { message: serverMessages.api.cveNotFound } }, 404);
  });

  app.patch("/cves/:cveId/status", async (c) => {
    const user = await requireAdmin(c);
    if (!user) return c.json({ ok: false, error: { message: serverMessages.api.adminLoginRequired } }, 403);

    const parsed = batchStatusSchema.shape.status.safeParse((await c.req.json().catch(() => null))?.status);
    if (!parsed.success) {
      return c.json({ ok: false, error: { message: serverMessages.api.invalidTriageStatus } }, 400);
    }

    const record = await updateStatus(c.req.param("cveId"), parsed.data, user.email);
    if (record) await invalidateCache();

    return record
      ? c.json({ data: record })
      : c.json({ ok: false, error: { message: serverMessages.api.cveNotFound } }, 404);
  });

  app.patch("/cves/:cveId", async (c) => {
    const user = await requireAdmin(c);
    if (!user) return c.json({ ok: false, error: { message: serverMessages.api.adminLoginRequired } }, 403);

    const parsed = cvePatchSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(
        { ok: false, error: { message: serverMessages.api.invalidCveFields, details: parsed.error.flatten() } },
        400,
      );
    }

    const record = await updateCve(c.req.param("cveId"), parsed.data, user.email);
    if (record) await invalidateCache();

    return record
      ? c.json({ data: record })
      : c.json({ ok: false, error: { message: serverMessages.api.cveNotFound } }, 404);
  });

  app.delete("/cves/:cveId", async (c) => {
    const user = await requireAdmin(c);
    if (!user) return c.json({ ok: false, error: { message: serverMessages.api.adminLoginRequired } }, 403);

    const deleted = await deleteCve(c.req.param("cveId"), user.email);
    if (deleted) await invalidateCache();

    return deleted
      ? c.json({ data: { deleted: true } })
      : c.json({ ok: false, error: { message: serverMessages.api.cveNotFound } }, 404);
  });
}
