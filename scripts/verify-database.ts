import assert from "node:assert/strict";
import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { closeSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { chromium, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";

import { loadSourceData } from "../src/server/data/parser";

function localUrl(name: string) {
  const value = process.env[name];
  assert(value, `${name} is required`);
  const url = new URL(value);
  assert(["localhost", "127.0.0.1"].includes(url.hostname), `${name} must point to a disposable local service`);
  return url;
}

async function main() {
  const database = localUrl("ARGUS_TEST_DATABASE_URL");
  assert.equal(database.pathname, "/argus_verification", "Only the disposable argus_verification database is allowed");
  const auth = localUrl("ARGUS_TEST_SUPABASE_URL");
  const key = process.env.ARGUS_TEST_SUPABASE_PUBLISHABLE_KEY;
  assert(key, "ARGUS_TEST_SUPABASE_PUBLISHABLE_KEY is required");
  assert(key.startsWith("sb_publishable_"), "A local Supabase publishable key is required");
  const baseURL = "http://localhost:3111";
  const occupied = await fetch(`${baseURL}/api/health`, { signal: AbortSignal.timeout(2000) }).catch(() => null);
  assert.equal(occupied, null, "Port 3111 is already in use; do not reuse another server");

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const output = path.resolve("output/database-verification", runId);
  mkdirSync(output, { recursive: true });
  const report = {
    startedAt: new Date().toISOString(),
    baseCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    environment: { demoMode: false, database: "argus_verification", node: process.version, browser: "" },
    sourceChecksum: "",
    status: "running",
    checks: [] as string[],
    sql: [] as unknown[],
    http: [] as unknown[],
    error: "",
  };
  const pool = new Pool({ connectionString: database.toString() });
  const serverLog = openSync(path.join(output, "server.log"), "a", 0o600);
  let server: ChildProcess | undefined;
  let page: Page | undefined;
  const email = `argus-verify-${Date.now()}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "development",
    DEMO_MODE: "false",
    ADMIN_EMAIL: email,
    DATABASE_URL: database.toString(),
    DIRECT_URL: database.toString(),
    NEXT_PUBLIC_SUPABASE_URL: auth.toString().replace(/\/$/, ""),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
    AUTH_GOOGLE_ENABLED: "false",
    AUTH_GITHUB_ENABLED: "false",
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    QSTASH_TOKEN: "",
    QSTASH_URL: "",
    QSTASH_CURRENT_SIGNING_KEY: "",
    QSTASH_NEXT_SIGNING_KEY: "",
    NEXT_TELEMETRY_DISABLED: "1",
  };

  async function sql(label: string, query: string, values: string[] = []) {
    const { rows } = await pool.query(query, values);
    report.sql.push({ label, query, values, rows });
    return rows;
  }

  async function stopServer() {
    const child = server;
    server = undefined;
    if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
    const pid = child.pid;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => process.kill(-pid, "SIGKILL"), 10000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
      process.kill(-pid, "SIGTERM");
    });
  }

  async function startServer() {
    server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "dev", "--hostname", "localhost", "--port", "3111"],
      {
        env,
        detached: true,
        stdio: ["ignore", serverLog, serverLog],
      },
    );
    for (let attempt = 0; attempt < 90; attempt += 1) {
      assert.equal(server.exitCode, null, "Next server exited; inspect server.log");
      const response = await fetch(`${baseURL}/api/health`, { signal: AbortSignal.timeout(2000) }).catch(() => null);
      if (response?.ok) return;
      await delay(1000);
    }
    throw new Error("Next server did not become healthy");
  }

  const browser = await chromium.launch();
  try {
    report.environment.browser = browser.version();
    const source = await loadSourceData();
    report.sourceChecksum = source.checksum;
    const [counts] = await sql(
      "seeded database",
      'SELECT version(), (SELECT count(*)::int FROM "Cve") AS cves, (SELECT count(*)::int FROM "Component") AS components, (SELECT count(*)::int FROM "_prisma_migrations" WHERE finished_at IS NOT NULL) AS migrations',
    );
    assert.equal(counts.cves, source.cves.length);
    assert.equal(counts.components, source.components.length);
    assert.equal(counts.migrations, 3);
    const [originalCve] = await sql(
      "source CVE",
      'SELECT "cveId", title, "cvssScoreV3" FROM "Cve" ORDER BY "cveId" LIMIT 1',
    );
    const { cveId } = originalCve;
    const cvePath = `/api/cves/${encodeURIComponent(cveId)}`;
    const name = `argus-verification-${Date.now()}`;
    const purl = `pkg:maven/org.argus/${name}@1.0.0`;
    const componentPath = `/api/components/${encodeURIComponent(purl)}`;

    const supabase = createClient(auth.toString(), key, { auth: { persistSession: false, autoRefreshToken: false } });
    const signup = await supabase.auth.signUp({ email, password });
    assert.ifError(signup.error);
    assert(signup.data.session, "Local test Auth must have email confirmation disabled");
    await supabase.auth.signOut();
    report.checks.push("A new account was registered through real local Supabase Auth with a publishable key");

    await startServer();
    const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
    page = await context.newPage();
    page.setDefaultTimeout(30000);
    await page.goto("/");

    async function request(method: string, url: string, data: unknown, status: number) {
      const response = await context.request.fetch(url, { method, data, headers: { Origin: baseURL } });
      report.http.push({
        method,
        path: url,
        request: data,
        status: response.status(),
        response: await response.json(),
      });
      assert.equal(response.status(), status, `${method} ${url}`);
    }

    async function mutation(method: string, url: string, action: () => Promise<unknown>, status = 200) {
      const pending = page!.waitForResponse(
        (response) => new URL(response.url()).pathname === url && response.request().method() === method,
      );
      await action();
      const response = await pending;
      report.http.push({
        method,
        path: url,
        request: response.request().postDataJSON(),
        status: response.status(),
        response: await response.json(),
      });
      assert.equal(response.status(), status, `${method} ${url}`);
    }

    await request("PATCH", cvePath, { title: "Guest must not write" }, 403);
    await request("POST", "/api/components", { purl, name, version: "1.0.0" }, 403);
    assert.equal(
      (await sql("Guest wrote no component", 'SELECT * FROM "Component" WHERE purl = $1', [purl])).length,
      0,
    );
    report.checks.push("Guest CVE modification and Component creation were rejected with HTTP 403");

    await page.getByLabel("登录 Admin").click();
    const login = page.getByRole("dialog", { name: "登录" });
    await login.getByRole("textbox", { name: "邮箱" }).fill(email);
    await login.getByRole("textbox", { name: "密码" }).fill(password);
    await login.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.getByRole("button", { name: "退出 Admin" })).toBeVisible();
    await expect(page.getByText("登录成功", { exact: true })).toBeVisible();
    const identity = await context.request.get("/api/auth/me");
    assert.equal((await identity.json()).data.role, "admin");
    await request("POST", "/api/auth/demo-login", {}, 403);
    await request("PATCH", cvePath, { cvssScoreV3: 11 }, 400);
    await request("POST", "/api/components", { purl, name: "", version: "1.0.0" }, 400);
    assert.deepEqual(
      (
        await sql(
          "rejected writes changed no CVE",
          'SELECT "cveId", title, "cvssScoreV3" FROM "Cve" WHERE "cveId" = $1',
          [cveId],
        )
      )[0],
      originalCve,
    );
    assert.equal(
      (await sql("invalid input created no component", 'SELECT purl FROM "Component" WHERE purl = $1', [purl])).length,
      0,
    );
    report.checks.push("Real password login restored Admin; Demo login was disabled; invalid input returned HTTP 400");

    await page.getByLabel("筛选当前漏洞列表").fill(cveId);
    await page.getByRole("row", { name: `查看 ${cveId}` }).click();
    await page.getByRole("button", { name: "编辑记录", exact: true }).click();
    const cveEditor = page.getByRole("dialog", { name: "编辑记录", exact: true });
    const title = `Database persistence verification ${runId}`;
    await cveEditor.locator("#cve-title").fill(title);
    await mutation("PATCH", cvePath, () => cveEditor.getByRole("button", { name: "保存修改" }).click());
    await expect(cveEditor).toBeHidden();
    assert.equal(
      (await sql("CVE update committed", 'SELECT title FROM "Cve" WHERE "cveId" = $1', [cveId]))[0].title,
      title,
    );
    await page.screenshot({ path: path.join(output, "cve-updated.png"), fullPage: true });
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Components", exact: true }).click();
    await page.getByRole("button", { name: "新增组件" }).click();
    const editor = page.getByRole("dialog", { name: "新增组件", exact: true });
    await editor.locator("#component-purl").fill(purl);
    await editor.locator("#component-name").fill(name);
    await editor.locator("#component-version").fill("1.0.0");
    await editor.locator("#component-vendor").fill("org.argus");
    await mutation("POST", "/api/components", () => editor.getByRole("button", { name: "创建组件" }).click(), 201);
    await expect(editor).toBeHidden();
    assert.equal(
      (await sql("Component created", 'SELECT name FROM "Component" WHERE purl = $1', [purl]))[0].name,
      name,
    );
    await page.getByLabel("筛选组件列表").fill(name);
    await page.getByRole("button", { name: `编辑 ${name}`, exact: true }).click();
    const edit = page.getByRole("dialog", { name: "编辑组件", exact: true });
    const updatedName = `${name}-updated`;
    await edit.locator("#component-name").fill(updatedName);
    await mutation("PATCH", componentPath, () => edit.getByRole("button", { name: "保存修改" }).click());
    await expect(edit).toBeHidden();
    assert.equal(
      (await sql("Component updated", 'SELECT name FROM "Component" WHERE purl = $1', [purl]))[0].name,
      updatedName,
    );
    await page.screenshot({ path: path.join(output, "component-updated.png"), fullPage: true });

    await stopServer();
    await startServer();
    await page.reload();
    await expect(page.getByRole("button", { name: "退出 Admin" })).toBeVisible();
    await page.getByLabel("筛选当前漏洞列表").fill(cveId);
    await expect(page.getByRole("row", { name: `查看 ${cveId}` })).toContainText(title);
    assert.equal(
      (await sql("CVE survives process restart", 'SELECT title FROM "Cve" WHERE "cveId" = $1', [cveId]))[0].title,
      title,
    );
    await page.getByRole("button", { name: "Components", exact: true }).click();
    await page.getByLabel("筛选组件列表").fill(updatedName);
    await expect(page.getByRole("button", { name: `编辑 ${updatedName}`, exact: true })).toBeVisible();
    assert.equal(
      (await sql("Component survives process restart", 'SELECT name FROM "Component" WHERE purl = $1', [purl]))[0].name,
      updatedName,
    );
    await page.screenshot({ path: path.join(output, "persisted-after-restart.png"), fullPage: true });
    report.checks.push(
      "CVE and Maven Component UI query/update reached PostgreSQL; values and Admin session survived a server restart",
    );

    await page.getByRole("button", { name: `编辑 ${updatedName}`, exact: true }).click();
    await page.getByRole("dialog", { name: "编辑组件", exact: true }).getByRole("button", { name: "删除组件" }).click();
    await mutation("DELETE", componentPath, () =>
      page!.getByRole("alertdialog").getByRole("button", { name: "确认删除", exact: true }).click(),
    );
    assert.equal((await sql("Component deleted", 'SELECT purl FROM "Component" WHERE purl = $1', [purl])).length, 0);
    await page.getByRole("button", { name: "Triage", exact: true }).click();
    await page.getByLabel("筛选当前漏洞列表").fill(cveId);
    await page.getByRole("row", { name: `查看 ${cveId}` }).click();
    await page.getByRole("button", { name: "删除漏洞", exact: true }).click();
    await page.screenshot({ path: path.join(output, "cve-delete-confirmation.png"), fullPage: true });
    await mutation("DELETE", cvePath, () => page!.getByRole("button", { name: "确认删除漏洞", exact: true }).click());
    assert.equal((await sql("CVE deleted", 'SELECT "cveId" FROM "Cve" WHERE "cveId" = $1', [cveId])).length, 0);

    await stopServer();
    await startServer();
    await page.reload();
    await request("GET", cvePath, undefined, 404);
    const components = await context.request.get(`/api/components?query=${encodeURIComponent(purl)}`);
    assert.deepEqual((await components.json()).data, []);
    await page.getByLabel("筛选当前漏洞列表").fill(cveId);
    await expect(page.getByText("没有匹配的漏洞", { exact: true })).toBeVisible();
    await expect(page.getByRole("row", { name: `查看 ${cveId}` })).toHaveCount(0);
    await page.screenshot({ path: path.join(output, "deleted-after-restart.png"), fullPage: true });
    const [finalCounts] = await sql(
      "final row counts",
      'SELECT (SELECT count(*)::int FROM "Cve") AS cves, (SELECT count(*)::int FROM "Component") AS components',
    );
    assert.equal(finalCounts.cves, source.cves.length - 1);
    assert.equal(finalCounts.components, source.components.length);
    const events = await sql(
      "audit retained after deletion",
      'SELECT action, "actorEmail", "targetId", "createdAt" FROM "AuditEvent" WHERE "actorEmail" = $1 ORDER BY "createdAt"',
      [email],
    );
    assert.deepEqual(
      events.map((event) => event.action).sort(),
      ["CVE_UPDATED", "CVE_DELETED", "COMPONENT_CREATED", "COMPONENT_UPDATED", "COMPONENT_DELETED"].sort(),
    );
    report.checks.push(
      "Both confirmed deletions survived a second restart; all five mutation audit events remained in PostgreSQL",
    );
    report.status = "passed";
  } catch (error) {
    report.status = "failed";
    report.error = error instanceof Error ? error.message : String(error);
    if (page) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
    await stopServer();
    closeSync(serverLog);
    await pool.end();
    writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
    process.stdout.write(`${report.status}: ${output}\n`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
