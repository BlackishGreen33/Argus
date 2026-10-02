import "server-only";

import { z } from "zod";

import { serverMessages } from "@/i18n/server";
import type { ApiApp } from "@/server/api/types";

const jsonResponse = { description: "JSON response" } as const;

export function registerSystemRoutes(app: ApiApp) {
  app.get("/health", (c) => c.json({ ok: true, service: "argus", node: process.version }));

  app.get("/docs", (c) =>
    c.html(
      "<!doctype html><html><head><title>" +
        serverMessages.api.restTitle +
        '</title><meta charset="utf-8" /></head><body style="font-family:system-ui;padding:40px;background:#f4f1eb;color:#262522"><h1>' +
        serverMessages.api.restTitle +
        "</h1><p>" +
        serverMessages.api.openApiJson +
        ': <a href="/openapi.json">/api/openapi.json</a></p><p>' +
        serverMessages.api.tryEndpoints +
        " <code>GET /api/cves</code> " +
        serverMessages.api.tryEndpoints +
        " <code>GET /api/overview</code>.</p></body></html>",
    ),
  );
}

export function registerOpenApiPaths(app: ApiApp) {
  app.openAPIRegistry.registerPath({ method: "get", path: "/health", responses: { 200: jsonResponse } });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/cves",
    request: {
      query: z.object({
        query: z.string().optional(),
        severity: z.string().optional(),
        status: z.string().optional(),
        ecosystem: z.string().optional(),
        page: z.string().optional(),
        pageSize: z.string().optional(),
      }),
    },
    responses: { 200: jsonResponse },
  });
  ["/cves/{cveId}", "/components/{purl}"].forEach((path) =>
    app.openAPIRegistry.registerPath({
      method: "get",
      path,
      request: { params: z.object({ [path.includes("cveId") ? "cveId" : "purl"]: z.string() }) },
      responses: { 200: jsonResponse, 404: jsonResponse },
    }),
  );
  [
    ["/auth/providers", "get"],
    ["/auth/me", "get"],
    ["/auth/callback", "get"],
    ["/search", "get"],
    ["/overview", "get"],
    ["/audit-events", "get"],
    ["/components", "get"],
  ].forEach(([path, method]) =>
    app.openAPIRegistry.registerPath({ method: method as "get", path, responses: { 200: jsonResponse } }),
  );
  [
    ["/auth/demo-login", "post"],
    ["/auth/login", "post"],
    ["/auth/logout", "post"],
    ["/imports", "post"],
    ["/cves/batch-status", "post"],
    ["/imports/{id}/merge", "post"],
    ["/imports/{id}/retry", "post"],
    ["/import-worker", "post"],
  ].forEach(([path, method]) =>
    app.openAPIRegistry.registerPath({
      method: method as "post",
      path,
      request: { body: { content: { "application/json": { schema: z.record(z.string(), z.unknown()) } } } },
      responses: { 200: jsonResponse },
    }),
  );
  [
    ["/cves/{cveId}", "patch"],
    ["/cves/{cveId}", "delete"],
    ["/cves/{cveId}/status", "patch"],
    ["/components", "post"],
    ["/components/{purl}", "patch"],
    ["/components/{purl}", "delete"],
    ["/cpe-candidates/{id}", "patch"],
  ].forEach(([path, method]) =>
    app.openAPIRegistry.registerPath({
      method: method as "patch" | "post" | "delete",
      path,
      ...(method === "post"
        ? { request: { body: { content: { "application/json": { schema: z.record(z.string(), z.unknown()) } } } } }
        : {}),
      responses: { 200: jsonResponse },
    }),
  );
}
