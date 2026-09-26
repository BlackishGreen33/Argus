import { OpenAPIHono } from "@hono/zod-openapi";
import { setCookie, deleteCookie } from "hono/cookie";
import { handle } from "hono/vercel";
import { z } from "zod";
import { authProviders, createOAuthUrl, resolveUser, isAdmin, signInWithPassword, ADMIN_EMAIL, DEMO_MODE } from "@/app/lib/auth";
import { qstashReceiver } from "@/app/lib/qstash";
import {
  batchUpdateStatus,
  createComponent,
  createImportJob,
  deleteComponent,
  deleteCve,
  getCve,
  getImportJob,
  listAuditEvents,
  listComponents,
  listCves,
  mergeImportJob,
  prepareImportJob,
  overview,
  retryImportJob,
  updateCandidate,
  updateComponent,
  updateCve,
  updateStatus,
} from "@/app/lib/store";
import { TRIAGE_STATUSES } from "@/app/lib/types";

const app = new OpenAPIHono().basePath("/api");

const cvePatchSchema = z.object({
  title: z.string().min(1).max(512).optional(),
  description: z.string().min(1).max(20000).optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  cvssScoreV2: z.number().min(0).max(10).nullable().optional(),
  cvssScoreV3: z.number().min(0).max(10).nullable().optional(),
  cvssScoreV4: z.number().min(0).max(10).nullable().optional(),
  affectedVersions: z.array(z.string()).optional(),
  cweIds: z.array(z.string()).optional(),
});

const componentSchema = z.object({
  purl: z.string().min(3).max(512),
  cpe: z.string().max(255).nullable().optional(),
  type: z.string().max(255).nullable().optional(),
  vendor: z.string().max(255).nullable().optional(),
  name: z.string().min(1).max(255),
  version: z.string().min(1).max(255),
  license: z.string().max(1000).nullable().optional(),
  description: z.string().max(20000).nullable().optional(),
  repository: z.string().url().or(z.literal("")).nullable().optional(),
  publishDate: z.string().nullable().optional(),
  language: z.string().max(255).nullable().optional(),
  recordTime: z.string().nullable().optional(),
});

function jsonError(message: string, status: 400 | 401 | 403 | 404 | 409 | 500, details?: unknown) {
  return new Response(JSON.stringify({ ok: false, error: { message, details } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function requireAdmin(request: Request) {
  const user = await resolveUser(request);
  return isAdmin(user) ? user : null;
}

app.get("/health", (c) => c.json({ ok: true, service: "argus", node: process.version }));

app.get("/auth/providers", (c) => c.json({ data: authProviders() }));
app.get("/auth/me", async (c) => c.json({ data: await resolveUser(c.req.raw) }));

app.post("/auth/demo-login", async (c) => {
  if (process.env.DEMO_MODE === "false") return c.json({ ok: false, error: { message: "Demo login is disabled" } }, 403);
  const body = await c.req.json().catch(() => ({}));
  const email = typeof body.email === "string" && body.email.includes("@") ? body.email.toLowerCase() : ADMIN_EMAIL;
  setCookie(c, "argus_demo_admin", "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  return c.json({ data: { email, role: "admin", provider: body.provider ?? "email" } });
});

app.post("/auth/login", async (c) => {
  const body = await c.req.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !body?.password) return c.json({ ok: false, error: { message: "请输入 Email 和密码" } }, 400);
  if (DEMO_MODE) {
    setCookie(c, "argus_demo_admin", "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
    return c.json({ data: { email, role: "admin", provider: "email" } });
  }
  const { data, error } = await signInWithPassword(email, body.password);
  if (error || !data.session || !data.user.email) return c.json({ ok: false, error: { message: error?.message ?? "登录失败" } }, 401);
  return c.json({ data: { email: data.user.email, role: data.user.email.toLowerCase() === ADMIN_EMAIL ? "admin" : "guest", provider: "email", accessToken: data.session.access_token } });
});

app.get("/auth/oauth/:provider", async (c) => {
  const provider = c.req.param("provider");
  if (provider !== "google" && provider !== "github") return c.json({ ok: false, error: { message: "不支持的登录 Provider" } }, 400);
  if (!authProviders()[provider]) return c.json({ ok: false, error: { message: "该 Provider 尚未配置" } }, 400);
  const redirectTo = new URL("/", c.req.url).toString();
  const { data, error } = await createOAuthUrl(provider, redirectTo);
  return error || !data.url ? c.json({ ok: false, error: { message: error?.message ?? "无法创建登录链接" } }, 400) : c.json({ data: { url: data.url } });
});

app.post("/auth/logout", (c) => {
  deleteCookie(c, "argus_demo_admin", { path: "/" });
  return c.json({ data: { loggedOut: true } });
});

app.get("/cves", async (c) => {
  const result = await listCves({
    query: c.req.query("query"),
    severity: c.req.query("severity"),
    status: c.req.query("status"),
    ecosystem: c.req.query("ecosystem"),
    page: Number(c.req.query("page") ?? 1),
    pageSize: Number(c.req.query("pageSize") ?? 10),
  });
  return c.json({ data: result.data, meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
});

app.get("/search", async (c) => {
  const query = c.req.query("query")?.trim();
  if (!query) return c.json({ data: [] });
  const [cves, components] = await Promise.all([listCves({ query, page: 1, pageSize: 8 }), listComponents(query)]);
  return c.json({
    data: [
      ...cves.data.slice(0, 8).map((item) => ({ type: "CVE", label: item.cveId, sublabel: item.title ?? item.description ?? "", target: item.cveId })),
      ...components.slice(0, 8).map((item) => ({ type: "Component", label: item.name, sublabel: item.purl, target: item.purl })),
    ],
  });
});

app.post("/cves/batch-status", async (c) => {
  const user = await requireAdmin(c.req.raw);
  if (!user) return c.json({ ok: false, error: { message: "Admin login required" } }, 403);
  const body = await c.req.json().catch(() => null);
  const ids = Array.isArray(body?.cveIds) ? body.cveIds.filter((item: unknown): item is string => typeof item === "string") : [];
  const status = body?.status as string;
  if (!ids.length || !TRIAGE_STATUSES.includes(status as (typeof TRIAGE_STATUSES)[number])) return c.json({ ok: false, error: { message: "cveIds and status are required" } }, 400);
  return c.json({ data: await batchUpdateStatus(ids, status as any, user.email) });
});

app.get("/cves/:cveId", async (c) => {
  const record = await getCve(c.req.param("cveId"));
  return record ? c.json({ data: record }) : c.json({ ok: false, error: { message: "CVE not found" } }, 404);
});

app.patch("/cves/:cveId/status", async (c) => {
  const user = await requireAdmin(c.req.raw);
  if (!user) return c.json({ ok: false, error: { message: "Admin login required" } }, 403);
  const body = await c.req.json().catch(() => null);
  if (!TRIAGE_STATUSES.includes(body?.status)) return c.json({ ok: false, error: { message: "Invalid triage status" } }, 400);
  const record = await updateStatus(c.req.param("cveId"), body.status, user.email);
  return record ? c.json({ data: record }) : c.json({ ok: false, error: { message: "CVE not found" } }, 404);
});

app.patch("/cves/:cveId", async (c) => {
  const user = await requireAdmin(c.req.raw);
  if (!user) return c.json({ ok: false, error: { message: "Admin login required" } }, 403);
  const parsed = cvePatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ ok: false, error: { message: "Invalid CVE fields", details: parsed.error.flatten() } }, 400);
  const record = await updateCve(c.req.param("cveId"), parsed.data, user.email);
  return record ? c.json({ data: record }) : c.json({ ok: false, error: { message: "CVE not found" } }, 404);
});

app.delete("/cves/:cveId", async (c) => {
  const user = await requireAdmin(c.req.raw);
  if (!user) return c.json({ ok: false, error: { message: "Admin login required" } }, 403);
  const deleted = await deleteCve(c.req.param("cveId"), user.email);
  return deleted ? c.json({ data: { deleted: true } }) : c.json({ ok: false, error: { message: "CVE not found" } }, 404);
});

app.get("/components", async (c) => c.json({ data: await listComponents(c.req.query("query") ?? "") }));

app.post("/components", async (c) => {
  const user = await requireAdmin(c.req.raw);
  if (!user) return c.json({ ok: false, error: { message: "Admin login required" } }, 403);
  const parsed = componentSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ ok: false, error: { message: "Invalid component fields", details: parsed.error.flatten() } }, 400);
  try {
    return c.json({ data: await createComponent(parsed.data as any, user.email) }, 201);
  } catch (error) {
    return c.json({ ok: false, error: { message: error instanceof Error ? error.message : "Component already exists" } }, 409);
  }
});

app.patch("/components/:purl{.+}", async (c) => {
  const user = await requireAdmin(c.req.raw);
  if (!user) return c.json({ ok: false, error: { message: "Admin login required" } }, 403);
  const parsed = componentSchema.partial().omit({ purl: true }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ ok: false, error: { message: "Invalid component fields", details: parsed.error.flatten() } }, 400);
  const record = await updateComponent(decodeURIComponent(c.req.param("purl")), parsed.data as any, user.email);
  return record ? c.json({ data: record }) : c.json({ ok: false, error: { message: "Component not found" } }, 404);
});

app.delete("/components/:purl{.+}", async (c) => {
  const user = await requireAdmin(c.req.raw);
  if (!user) return c.json({ ok: false, error: { message: "Admin login required" } }, 403);
  const deleted = await deleteComponent(decodeURIComponent(c.req.param("purl")), user.email);
  return deleted ? c.json({ data: { deleted: true } }) : c.json({ ok: false, error: { message: "Component not found" } }, 404);
});

app.patch("/cpe-candidates/:id", async (c) => {
  const user = await requireAdmin(c.req.raw);
  if (!user) return c.json({ ok: false, error: { message: "Admin login required" } }, 403);
  const body = await c.req.json().catch(() => null);
  if (body?.status !== "CONFIRMED" && body?.status !== "REJECTED") return c.json({ ok: false, error: { message: "Invalid candidate status" } }, 400);
  const result = await updateCandidate(c.req.param("id"), body.status, user.email);
  return result ? c.json({ data: result }) : c.json({ ok: false, error: { message: "Candidate not found" } }, 404);
});

app.get("/overview", async (c) => c.json({ data: await overview() }));
app.get("/audit-events", async (c) => c.json({ data: await listAuditEvents() }));

app.post("/imports", async (c) => {
  const user = await requireAdmin(c.req.raw);
  if (!user) return c.json({ ok: false, error: { message: "Admin login required" } }, 403);
  return c.json({ data: await createImportJob(user.email) }, 202);
});

app.get("/imports/:id", async (c) => {
  const job = await getImportJob(c.req.param("id"));
  return job ? c.json({ data: job }) : c.json({ ok: false, error: { message: "Import job not found" } }, 404);
});

app.post("/imports/:id/merge", async (c) => {
  const user = await requireAdmin(c.req.raw);
  if (!user) return c.json({ ok: false, error: { message: "Admin login required" } }, 403);
  const job = await mergeImportJob(c.req.param("id"), user.email);
  return job ? c.json({ data: job }) : c.json({ ok: false, error: { message: "Import job not found" } }, 404);
});

app.post("/imports/:id/retry", async (c) => {
  const user = await requireAdmin(c.req.raw);
  if (!user) return c.json({ ok: false, error: { message: "Admin login required" } }, 403);
  const job = await retryImportJob(c.req.param("id"), user.email);
  return job ? c.json({ data: job }) : c.json({ ok: false, error: { message: "Import job not found" } }, 404);
});

app.post("/import-worker", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("upstash-signature");
  if (qstashReceiver) {
    if (!signature) return c.json({ ok: false, error: { message: "Missing QStash signature" } }, 401);
    try {
      const valid = await qstashReceiver.verify({ signature, body: rawBody, url: c.req.url });
      if (!valid) return c.json({ ok: false, error: { message: "Invalid QStash signature" } }, 401);
    } catch {
      return c.json({ ok: false, error: { message: "Invalid QStash signature" } }, 401);
    }
  } else if (process.env.DEMO_MODE === "false") {
    return c.json({ ok: false, error: { message: "QStash verification is not configured" } }, 503);
  }
  let body: { jobId?: string; actorEmail?: string };
  try {
    body = JSON.parse(rawBody) as { jobId?: string; actorEmail?: string };
  } catch {
    return c.json({ ok: false, error: { message: "Invalid worker payload" } }, 400);
  }
  if (!body.jobId) return c.json({ ok: false, error: { message: "jobId is required" } }, 400);
  const job = await prepareImportJob(body.jobId, body.actorEmail ?? ADMIN_EMAIL);
  return job ? c.json({ data: job }) : c.json({ ok: false, error: { message: "Import job not found" } }, 404);
});

app.get("/openapi.json", (c) => c.json({ openapi: "3.0.0", info: { title: "Argus REST API", version: "0.1.0" }, paths: { "/api/cves": { get: { summary: "List CVEs" } }, "/api/cves/{cveId}/status": { patch: { summary: "Update triage status" } }, "/api/components": { get: { summary: "List components" }, post: { summary: "Create component" } } } }));
app.get("/docs", (c) => c.html(`<!doctype html><html><head><title>Argus API</title><meta charset="utf-8" /></head><body style="font-family:system-ui;padding:40px;background:#f4f1eb;color:#262522"><h1>Argus REST API</h1><p>OpenAPI JSON: <a href="/api/openapi.json">/api/openapi.json</a></p><p>Try <code>GET /api/cves</code> or <code>GET /api/overview</code>.</p></body></html>`));

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
