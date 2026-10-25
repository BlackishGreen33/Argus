import { expect, test } from "@playwright/test";

test("animated CVSS keeps scores, zero and missing values distinct", async ({ page }) => {
  await page.route("**/api/cves?**", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data = [null, 0, 10, 9.8].map((value, index) => ({
      ...body.data[0],
      id: `gauge-${index}`,
      cveId: `CVE-2026-${1000 + index}`,
      cvssScoreV3: value,
      cvssScoreV4: null,
    }));
    body.meta = { ...body.meta, total: 4 };
    await route.fulfill({ json: body });
  });
  await page.goto("/");
  const gauges = page.locator(".cvss");
  await expect(gauges).toHaveText(["—", "0", "10", "9.8"]);
  for (const [index, percent] of ["0", "0", "100", "98"].entries()) {
    await expect(gauges.nth(index)).toHaveAttribute("data-percent", percent);
    await expect(gauges.nth(index)).toHaveAccessibleName(/CVSS/);
  }
});

test("official tabs and sheets retain keyboard, focus and mobile width", async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const row = page.getByRole("row", { name: /查看 CVE-2026-9999/ });
    await row.focus();
    await row.press("Enter");
    const drawer = page.locator(".argus-drawer-sheet");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("tab")).toHaveText(["Overview", "Impact", "History"]);
    await expect.poll(async () => (await drawer.boundingBox())?.width).toBe(Math.min(width, 430));
    const tabList = drawer.getByRole("tablist");
    await expect.poll(async () => (await tabList.boundingBox())?.height ?? Infinity).toBeLessThanOrEqual(60);
    const listBounds = (await tabList.boundingBox())!;
    const panelBounds = (await drawer.getByRole("tabpanel", { name: "Overview", exact: true }).boundingBox())!;
    expect(panelBounds.y).toBeGreaterThanOrEqual(listBounds.y + listBounds.height);
    expect(panelBounds.width).toBeGreaterThanOrEqual(Math.min(width, 430) - (width <= 840 ? 32 : 48) - 2);
    const overview = drawer.getByRole("tab", { name: "Overview", exact: true });
    await overview.focus();
    await overview.press("ArrowRight");
    await expect(drawer.getByRole("tab", { name: "Impact", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(drawer.getByRole("tabpanel", { name: "Impact", exact: true })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(drawer.getByRole("tabpanel", { name: "History", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(row).toBeFocused();
  }
});

test("Cult copy feedback reports clipboard success and failure", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (value: string) => sessionStorage.setItem("test-copied", value) },
    });
  });
  await page.goto("/");
  await page.getByRole("row", { name: /查看 CVE-2026-9999/ }).click();
  const copy = page.locator('[data-slot="copy-button"]');
  await copy.click();
  await expect(copy).toHaveAttribute("data-copied", "true");
  expect(await page.evaluate(() => sessionStorage.getItem("test-copied"))).toBe("CVE-2026-9999");
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    });
    document.execCommand = () => false;
  });
  await page.getByRole("row", { name: /查看 CVE-2026-9999/ }).click();
  await copy.click();
  await expect(copy).toHaveAttribute("data-copied", "false");
  await expect(page.getByText("复制失败，请手动选择 CVE ID", { exact: true })).toBeVisible();
  await expect(copy).toBeFocused();
});

test("stateful refresh waits for the real job and never turns errors into success", async ({ page }) => {
  let imports = 0;
  let polls = 0;
  let ready = false;
  const job = {
    id: "ui-preview",
    status: "QUEUED",
    dataset: "builtin",
    retryCount: 0,
    createdAt: "2026-10-25T00:00:00Z",
  };
  await page.route("**/api/imports", async (route) => {
    imports += 1;
    if (imports === 2) {
      await route.fulfill({ status: 503, json: { ok: false, error: { message: "测试导入失败" } } });
    } else {
      await route.fulfill({ status: 202, json: { data: { ...job, status: imports === 3 ? "FAILED" : "QUEUED" } } });
    }
  });
  await page.route("**/api/imports/ui-preview", async (route) => {
    polls += 1;
    await route.fulfill({ json: { data: { ...job, status: ready ? "PREVIEW_READY" : "RUNNING" } } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  const refresh = page.locator(".page-heading button");
  await refresh.click();
  await expect(page.getByRole("dialog", { name: "登录", exact: true })).toBeVisible();
  await expect(refresh).toHaveAttribute("data-state", "idle");
  expect(imports).toBe(0);
  const login = page.getByRole("dialog", { name: "登录", exact: true });
  await login.getByRole("textbox", { name: "邮箱" }).fill("admin@argus.local");
  await login.getByRole("textbox", { name: "密码" }).fill("argus-demo");
  await login.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("button", { name: "退出 Admin" })).toBeVisible();
  await refresh.click();
  await expect(refresh).toHaveAttribute("data-state", "loading");
  await expect(refresh).toBeDisabled();
  await expect(page.locator(".import-top button")).toBeDisabled();
  await expect.poll(() => polls).toBeGreaterThan(0);
  await expect(refresh).toHaveAttribute("data-state", "loading");
  expect(imports).toBe(1);
  ready = true;
  await expect(refresh).toHaveAttribute("data-state", "success");
  await expect(refresh).toHaveText("预览已就绪");
  await refresh.click();
  await expect(refresh).toHaveAttribute("data-state", "error");
  await expect(page.getByText("测试导入失败", { exact: true })).toBeVisible();
  await refresh.click();
  await expect(refresh).toHaveAttribute("data-state", "error");
  expect(imports).toBe(3);
});

test("reduced motion preserves final metric values and keyboard select behavior", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const severity = page.getByRole("button", { name: "严重度" });
  await severity.focus();
  await severity.press("Enter");
  await expect(page.getByRole("option", { name: "严重", exact: true })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator('[role="option"]:visible')).toHaveCount(0);
  await expect(severity).toBeFocused();
  await severity.press("Enter");
  await page.keyboard.press("Escape");
  await expect(severity).toBeFocused();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  const metrics = page.locator('[data-slot="number-ticker"]');
  await expect(metrics).toHaveCount(4);
  for (const metric of await metrics.all()) {
    await expect(metric.locator('[aria-hidden="true"]')).toHaveText(await metric.locator(".sr-only").innerText());
  }
});
