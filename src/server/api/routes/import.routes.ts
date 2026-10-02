import "server-only";

import { serverMessages } from "@/i18n/server";
import { requireAdmin } from "@/server/api/helpers";
import { importWorkerSchema } from "@/server/api/schemas";
import type { ApiApp } from "@/server/api/types";
import { ADMIN_EMAIL, DEMO_MODE } from "@/server/auth";
import { invalidateCache, withCache } from "@/server/cache/redis";
import { qstashReceiver } from "@/server/jobs/qstash";
import {
  createImportJob,
  getImportJob,
  listAuditEvents,
  mergeImportJob,
  overview,
  prepareImportJob,
  retryImportJob,
} from "@/server/services/store.service";

export function registerImportRoutes(app: ApiApp) {
  app.get("/overview", async (c) => c.json({ data: await withCache(["overview"], overview, 15) }));

  app.get("/audit-events", async (c) => c.json({ data: await withCache(["audit-events"], listAuditEvents, 5) }));

  app.post("/imports", async (c) => {
    const user = await requireAdmin(c);
    if (!user) return c.json({ ok: false, error: { message: serverMessages.api.adminLoginRequired } }, 403);

    const data = await createImportJob(user.email);
    await invalidateCache();
    return c.json({ data }, 202);
  });

  app.get("/imports/:id", async (c) => {
    const job = await getImportJob(c.req.param("id"));
    return job
      ? c.json({ data: job })
      : c.json({ ok: false, error: { message: serverMessages.api.importJobNotFound } }, 404);
  });

  app.post("/imports/:id/merge", async (c) => {
    const user = await requireAdmin(c);
    if (!user) return c.json({ ok: false, error: { message: serverMessages.api.adminLoginRequired } }, 403);

    const job = await mergeImportJob(c.req.param("id"), user.email);
    if (job) await invalidateCache();

    return job
      ? c.json({ data: job })
      : c.json({ ok: false, error: { message: serverMessages.api.importJobNotFound } }, 404);
  });

  app.post("/imports/:id/retry", async (c) => {
    const user = await requireAdmin(c);
    if (!user) return c.json({ ok: false, error: { message: serverMessages.api.adminLoginRequired } }, 403);

    const job = await retryImportJob(c.req.param("id"), user.email);
    if (job) await invalidateCache();

    return job
      ? c.json({ data: job })
      : c.json({ ok: false, error: { message: serverMessages.api.importJobNotFound } }, 404);
  });

  app.post("/import-worker", async (c) => {
    if (!DEMO_MODE && !qstashReceiver) {
      return c.json({ ok: false, error: { message: serverMessages.api.invalidQstashSignature } }, 503);
    }
    const rawBody = await c.req.text();
    const signature = c.req.header("upstash-signature");

    if (qstashReceiver) {
      if (!signature) {
        return c.json({ ok: false, error: { message: serverMessages.api.missingQstashSignature } }, 401);
      }

      try {
        const valid = await qstashReceiver.verify({ signature, body: rawBody, url: c.req.url });
        if (!valid) {
          return c.json({ ok: false, error: { message: serverMessages.api.invalidQstashSignature } }, 401);
        }
      } catch {
        return c.json({ ok: false, error: { message: serverMessages.api.invalidQstashSignature } }, 401);
      }
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return c.json({ ok: false, error: { message: serverMessages.api.invalidWorkerPayload } }, 400);
    }

    const parsed = importWorkerSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ ok: false, error: { message: serverMessages.api.jobIdRequired } }, 400);
    }

    const job = await prepareImportJob(parsed.data.jobId, parsed.data.actorEmail ?? ADMIN_EMAIL);
    if (job) await invalidateCache();

    return job
      ? c.json({ data: job })
      : c.json({ ok: false, error: { message: serverMessages.api.importJobNotFound } }, 404);
  });
}
