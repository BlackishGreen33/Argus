import "server-only";

import { OpenAPIHono } from "@hono/zod-openapi";

import { serverMessages } from "@/i18n/server";
import { registerAuthRoutes } from "@/server/api/routes/auth.routes";
import { registerComponentRoutes } from "@/server/api/routes/component.routes";
import { registerCveRoutes } from "@/server/api/routes/cve.routes";
import { registerImportRoutes } from "@/server/api/routes/import.routes";
import { registerOpenApiPaths, registerSystemRoutes } from "@/server/api/routes/system.routes";

export const app = new OpenAPIHono().basePath("/api");

registerSystemRoutes(app);
registerAuthRoutes(app);
registerCveRoutes(app);
registerComponentRoutes(app);
registerImportRoutes(app);
registerOpenApiPaths(app);
app.doc31("/openapi.json", {
  openapi: "3.1.0",
  info: { title: serverMessages.api.restTitle, version: "0.1.0" },
});
