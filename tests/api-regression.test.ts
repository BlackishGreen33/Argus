import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({ prisma: {} }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("DEMO_MODE", "true");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
});
it("rejects invalid enum, numeric and empty paging input", async () => {
  const { app } = await import("@/server/api/app");
  for (const query of ["status=BOGUS", "severity=BOGUS", "page=abc", "page=", "page=1.5"]) {
    expect((await app.request(`/api/cves?${query}`)).status, query).toBe(400);
  }
});
it("documents every business endpoint with request schemas", async () => {
  const { app } = await import("@/server/api/app");
  const doc = await (await app.request("/api/openapi.json")).json();
  expect(doc.paths["/api/cves"].get.parameters).toBeDefined();
  expect(doc.paths["/api/components"].post.requestBody).toBeDefined();
  expect(doc.paths["/api/imports/{id}/merge"].post).toBeDefined();
  expect(doc.paths["/api/auth/callback"].get).toBeDefined();
});
it("rejects cross-origin cookie-authenticated mutations", async () => {
  const { app } = await import("@/server/api/app");
  const response = await app.request("/api/auth/login", {
    method: "POST",
    headers: { origin: "https://evil.example", "content-type": "application/json" },
    body: JSON.stringify({ email: "admin@argus.local", password: "demo" }),
  });
  expect(response.status).toBe(403);
});
it("rejects an unsigned public worker in production", async () => {
  vi.stubEnv("DEMO_MODE", "false");
  const { app } = await import("@/server/api/app");
  expect(
    (await app.request("/api/import-worker", { method: "POST", body: JSON.stringify({ jobId: "none" }) })).status,
  ).toBe(503);
});
