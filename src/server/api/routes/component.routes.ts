import "server-only";

import { serverMessages } from "@/i18n/server";
import { requireAdmin } from "@/server/api/helpers";
import { candidateStatusSchema, componentSchema } from "@/server/api/schemas";
import type { ApiApp } from "@/server/api/types";
import { invalidateCache, withCache } from "@/server/cache/redis";
import {
  createComponent,
  deleteComponent,
  listComponents,
  updateCandidate,
  updateComponent,
} from "@/server/services/store.service";

export function registerComponentRoutes(app: ApiApp) {
  app.get("/components", async (c) => {
    const query = c.req.query("query") ?? "";
    const data = await withCache(["components", query], () => listComponents(query), 30);
    return c.json({ data });
  });

  app.post("/components", async (c) => {
    const user = await requireAdmin(c);
    if (!user) return c.json({ ok: false, error: { message: serverMessages.api.adminLoginRequired } }, 403);

    const parsed = componentSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(
        { ok: false, error: { message: serverMessages.api.invalidComponentFields, details: parsed.error.flatten() } },
        400,
      );
    }

    try {
      const data = await createComponent(parsed.data, user.email);
      await invalidateCache();
      return c.json({ data }, 201);
    } catch (error) {
      return c.json(
        {
          ok: false,
          error: { message: error instanceof Error ? error.message : serverMessages.api.componentAlreadyExists },
        },
        409,
      );
    }
  });

  app.patch("/components/:purl{.+}", async (c) => {
    const user = await requireAdmin(c);
    if (!user) return c.json({ ok: false, error: { message: serverMessages.api.adminLoginRequired } }, 403);

    const parsed = componentSchema
      .partial()
      .omit({ purl: true })
      .safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(
        { ok: false, error: { message: serverMessages.api.invalidComponentFields, details: parsed.error.flatten() } },
        400,
      );
    }

    const record = await updateComponent(decodeURIComponent(c.req.param("purl")), parsed.data, user.email);
    if (record) await invalidateCache();

    return record
      ? c.json({ data: record })
      : c.json({ ok: false, error: { message: serverMessages.api.componentNotFound } }, 404);
  });

  app.delete("/components/:purl{.+}", async (c) => {
    const user = await requireAdmin(c);
    if (!user) return c.json({ ok: false, error: { message: serverMessages.api.adminLoginRequired } }, 403);

    const deleted = await deleteComponent(decodeURIComponent(c.req.param("purl")), user.email);
    if (deleted) await invalidateCache();

    return deleted
      ? c.json({ data: { deleted: true } })
      : c.json({ ok: false, error: { message: serverMessages.api.componentNotFound } }, 404);
  });

  app.patch("/cpe-candidates/:id", async (c) => {
    const user = await requireAdmin(c);
    if (!user) return c.json({ ok: false, error: { message: serverMessages.api.adminLoginRequired } }, 403);

    const parsed = candidateStatusSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ ok: false, error: { message: serverMessages.api.invalidCandidateStatus } }, 400);
    }

    const result = await updateCandidate(c.req.param("id"), parsed.data.status, user.email);
    if (result) await invalidateCache();

    return result
      ? c.json({ data: result })
      : c.json({ ok: false, error: { message: serverMessages.api.candidateNotFound } }, 404);
  });
}
