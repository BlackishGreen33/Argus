import { expect, type Page, test } from "@playwright/test";

import type { ImportJob } from "../src/types/domain";

const preview: ImportJob = {
  id: "workflow-preview",
  dataset: "comp.sql + vul.sql",
  status: "PREVIEW_READY",
  retryCount: 0,
  createdAt: "2026-10-26T00:00:00Z",
  summary: { cves: 1000, components: 398 },
  sampleDiffs: [
    { entity: "CVE", key: "CVE-2026-9999", change: "来源资料可供预览" },
    { entity: "Component", key: "pkg:generic/very-long-package-name/7-zip@26.0", change: "来源资料可供预览" },
  ],
};

async function mockOverview(page: Page, job: () => ImportJob | null, admin = false) {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ json: { data: { role: admin ? "admin" : "guest", email: "admin@argus.local" } } }),
  );
  await page.route("**/api/overview", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.latestImport = job();
    await route.fulfill({ json: body });
  });
  await page.route("**/api/imports/workflow-preview", (route) => route.fulfill({ json: { data: job() } }));
}

async function openOverview(page: Page) {
  await page.goto("/");
  if ((page.viewportSize()?.width ?? 1440) <= 840) {
    await page.getByRole("button", { name: "展开导航", exact: true }).click();
  }
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  if ((page.viewportSize()?.width ?? 1440) <= 840) {
    await page.getByRole("button", { name: "折叠导航", exact: true }).click();
  }
  await expect(page.locator(".import-panel")).toContainText("等待合并");
}

for (const width of [1440, 390, 320]) {
  test(`import workflow at ${width}px keeps hierarchy, samples and touch targets`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await mockOverview(page, () => preview);
    await openOverview(page);
    const panel = page.locator(".import-panel");
    await panel.screenshot({ path: testInfo.outputPath(`overview-${width}.png`) });
    await expect(panel.getByRole("list", { name: "导入流程" }).getByRole("listitem")).toHaveCount(3);
    await expect(panel.locator('[aria-current="step"]')).toHaveText(/核对预览/);
    await expect(panel.locator(".import-count")).toHaveText(["1,000", "398"]);
    await expect(panel.getByRole("button", { name: "合并更新", exact: true })).toHaveCount(0);
    const samples = panel.getByRole("button", { name: /查看样本/ });
    await expect(samples).toHaveAttribute("aria-expanded", "false");
    await samples.focus();
    await samples.press("Enter");
    await expect(samples).toHaveAttribute("aria-expanded", "true");
    await expect(panel.getByText(preview.sampleDiffs![1].key, { exact: true })).toBeVisible();
    await samples.press("Tab");
    await panel.screenshot({ path: testInfo.outputPath(`overview-${width}-expanded.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    if (width <= 840) {
      expect((await samples.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(
        (await panel.getByRole("button", { name: "重新预览", exact: true }).boundingBox())!.height,
      ).toBeGreaterThanOrEqual(44);
    }
  });
}

test("import stages follow server state and merge waits for the actual result", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  let job: ImportJob | null = preview;
  await mockOverview(page, () => job, true);
  let releaseMerge: () => void = () => {};
  const pendingMerge = new Promise<void>((resolve) => {
    releaseMerge = resolve;
  });
  await page.route("**/api/imports/workflow-preview/merge", async (route) => {
    await pendingMerge;
    job = { ...preview, status: "SUCCEEDED" };
    await route.fulfill({ json: { data: job } });
  });
  await openOverview(page);
  const panel = page.locator(".import-panel");
  const merge = panel.locator(".import-next button");
  await panel.screenshot({ path: testInfo.outputPath("overview-admin.png") });
  await merge.click();
  await expect(merge).toBeDisabled();
  await expect(panel.locator('[aria-current="step"]')).toHaveText(/合并数据/);
  await expect(panel).not.toContainText("已完成");
  releaseMerge();
  await expect(panel.locator(".import-status")).toContainText("已完成");
  await expect(panel.locator('.import-step[data-state="complete"]')).toHaveCount(3);
  await expect(panel.locator('[aria-current="step"]')).toHaveCount(0);

  for (const status of ["QUEUED", "RUNNING", "MERGING", "FAILED"] as const) {
    job = { ...preview, status, errorMessage: status === "FAILED" ? "来源暂时不可用" : null };
    await page.reload();
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    await expect(panel).toBeVisible();
    if (status === "FAILED") {
      await expect(panel.getByRole("alert")).toContainText("来源暂时不可用");
      await expect(panel.locator('[aria-current="step"]')).toHaveCount(0);
      await expect(panel.getByRole("button", { name: "重试", exact: true })).toBeVisible();
    } else {
      await expect(panel.locator('[aria-current="step"]')).toHaveText(status === "MERGING" ? /合并数据/ : /解析来源/);
      await expect(panel.getByRole("button", { name: "重新预览", exact: true })).toBeDisabled();
    }
    await expect(panel.locator('.import-step[data-state="complete"]')).not.toHaveCount(3);
  }
  job = null;
  await page.reload();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(panel).toContainText("尚未运行");
  await expect(panel.locator(".import-count")).toHaveCount(0);
  await expect(panel.locator('[aria-current="step"]')).toHaveCount(0);
});

test("CVSS heading stays fully visible for Guest and Admin", async ({ page }, testInfo) => {
  for (const admin of [false, true]) {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({ json: { data: { role: admin ? "admin" : "guest", email: "admin@argus.local" } } }),
    );
    for (const width of [1440, 1024, 841]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/");
      await expect(page.locator(".argus-table-row").first()).toBeVisible();
      const heading = page.getByRole("columnheader", { name: "CVSS v3.1", exact: true });
      await expect(heading).toBeVisible();
      if (!admin && width === 1440) {
        await expect(page.locator('.cvss[data-value="9.8"] .cvss-value [aria-hidden="true"]').first()).toHaveText(
          "9.8",
        );
        await page.screenshot({ path: testInfo.outputPath("triage-desktop.png") });
      }
      expect(await heading.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    }
  }
});

test("failed merges retain retry without announcing success", async ({ page }) => {
  let job = preview;
  await mockOverview(page, () => job, true);
  await page.route("**/api/imports/workflow-preview/merge", (route) => {
    job = { ...preview, status: "FAILED", errorMessage: "测试合并失败" };
    return route.fulfill({ json: { data: job } });
  });
  await page.route("**/api/imports/workflow-preview/retry", (route) => {
    job = preview;
    return route.fulfill({ json: { data: job } });
  });
  await openOverview(page);
  const panel = page.locator(".import-panel");
  await panel.getByRole("button", { name: "合并更新", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("测试合并失败");
  await expect(page.getByText("预览已合并到正式数据", { exact: true })).toHaveCount(0);
  await expect(panel.locator('.import-step[data-state="complete"]')).toHaveCount(0);
  await panel.getByRole("button", { name: "重试", exact: true }).click();
  await expect(panel.locator('[aria-current="step"]')).toHaveText(/核对预览/);
  await expect(panel.getByRole("button", { name: "合并更新", exact: true })).toBeEnabled();
});

test("an existing running job resumes polling and a poll failure unlocks recovery", async ({ page }) => {
  await mockOverview(page, () => ({ ...preview, status: "RUNNING" }));
  let polls = 0;
  await page.route("**/api/imports/workflow-preview", (route) => {
    polls += 1;
    return route.fulfill({ status: 503, json: { ok: false, error: { message: "无法读取导入状态" } } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  const refresh = page.locator(".import-top button");
  await expect(refresh).toBeDisabled();
  await expect.poll(() => polls).toBeGreaterThan(0);
  await expect(refresh).toHaveAttribute("data-state", "error");
  await expect(refresh).toBeEnabled();
  await refresh.click();
  await expect(page.getByRole("dialog", { name: "登录", exact: true })).toBeVisible();
});

test("built-in preview renders real Demo counts without merging", async ({ page }, testInfo) => {
  const login = await page.request.post("/api/auth/login", {
    data: { email: "admin@argus.local", password: "argus-demo" },
  });
  expect(login.ok()).toBe(true);
  const response = await page.request.post("/api/imports");
  expect(response.ok()).toBe(true);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await openOverview(page);
    const panel = page.locator(".import-panel");
    await expect(panel.locator(".import-count")).toHaveText(["1,000", "398"]);
    await panel.screenshot({ path: testInfo.outputPath(`overview-real-${width}.png`) });
    await page.screenshot({ path: testInfo.outputPath(`overview-real-page-${width}.png`) });
  }
});

test("CVSS enters from zero with intermediate ring and number values", async ({ page }) => {
  await page.addInitScript(() => {
    const samples: Array<{ value: number; arc: number }> = [];
    Object.assign(window, { gaugeSamples: samples });
    const sample = () => {
      const gauge = document.querySelector('.cvss[data-value="9.8"]');
      const text = gauge?.querySelector('.cvss-value [aria-hidden="true"]')?.textContent;
      const circle = gauge?.querySelector("circle:last-child");
      if (text && circle) {
        samples.push({ value: Number(text), arc: parseFloat(getComputedStyle(circle).strokeDasharray) });
      }
      if (samples.length < 180) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.goto("/");
  const gauge = page.locator('.cvss[data-value="9.8"]').first();
  await expect(gauge).toHaveAccessibleName(/9.8/);
  await expect(gauge.locator('.cvss-value [aria-hidden="true"]')).toHaveText("9.8");
  const samples = await page.evaluate(
    () => (window as unknown as { gaugeSamples: Array<{ value: number; arc: number }> }).gaugeSamples,
  );
  expect(samples.some(({ value }) => value === 0)).toBe(true);
  expect(samples.some(({ value }) => value > 0 && value < 9.8)).toBe(true);
  expect(samples.some(({ arc }) => arc > 0 && arc < 270)).toBe(true);
  await expect
    .poll(() =>
      gauge
        .locator("circle")
        .last()
        .evaluate((node) => parseFloat(getComputedStyle(node).strokeDasharray)),
    )
    .toBeCloseTo(2 * Math.PI * 45 * 0.98, 1);
});

test("CVSS reduced motion directly renders final values", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const gauge = page.locator('.cvss[data-value="9.8"]').first();
  await expect(gauge.locator('.cvss-value [aria-hidden="true"]')).toHaveText("9.8");
  await expect(gauge).toHaveCSS("--transition-length", "0ms");
});
