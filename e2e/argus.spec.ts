import { expect, test } from "@playwright/test";

test("guest can inspect Triage and use global search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Triage" })).toBeVisible();
  await expect(page.getByLabel("全局搜索")).toBeVisible();
  await expect(page.getByLabel("筛选当前漏洞列表")).toBeVisible();
  await expect(page.getByText("CVE-2026-9999")).toBeVisible();

  await page.getByLabel("全局搜索").fill("express");
  await expect(page.getByRole("dialog", { name: "全局搜索" })).toContainText("Component");
  await page.keyboard.press("Escape");

  await page.getByLabel("筛选当前漏洞列表").fill("CVE-2026-9999");
  await expect(page.getByText("CVE-2026-9999")).toBeVisible();
  await page.getByRole("button", { name: "严重度" }).click();
  await expect(page.getByRole("option")).toHaveText(["严重", "高", "中", "低"]);
  await page.getByRole("option", { name: "严重", exact: true }).click();
  await expect(page.getByRole("button", { name: "严重", exact: true })).toContainText("严重");
  await expect(page.locator('[role="option"]:visible')).toHaveCount(0);
  await page.getByRole("button", { name: "清除筛选" }).click();
  await expect(page.getByRole("button", { name: "严重度" })).toContainText("严重度");
  await page.getByRole("button", { name: "状态" }).click();
  await expect(page.locator('[role="option"]:visible')).toHaveText(["待处理", "已确认", "已延后", "误报"]);
  await page.getByRole("option", { name: "待处理", exact: true }).click();
  await expect(page.getByText("CVE-2026-9999")).toBeVisible();
  const firstRow = page.getByRole("row", { name: /查看 CVE-2026-9999/ });
  await firstRow.click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "查看详情" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByText("CVE-2026-9999").click();
  const cveDialog = page.getByRole("dialog", {
    name: "Remote code execution in XStream via untrusted XML deserialization",
  });
  await expect(cveDialog).toBeVisible();
  await expect(cveDialog.getByRole("button", { name: "待处理" })).toHaveAttribute("aria-pressed", "true");
  const drawerBox = await cveDialog.boundingBox();
  expect(drawerBox?.x).toBeGreaterThan((page.viewportSize()?.width ?? 1280) / 2);
  await page.keyboard.press("Escape");
  await expect(cveDialog).toHaveCount(0);
});

test("refresh validates auth before showing the guest state", async ({ page }) => {
  await page.route("**/api/auth/me", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.continue();
  });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "正在验证登录状态" })).toBeVisible();
  await expect(page.getByLabel("登录 Admin")).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("status", { name: "正在验证登录状态" })).toHaveCount(0);
});

test("auth validation failure is visible and retryable", async ({ page }) => {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "验证服务暂不可用" } }),
    });
  });
  await page.goto("/");
  const retry = page.getByRole("button", { name: "重试登录状态验证" });
  await expect(retry).toBeVisible({ timeout: 10000 });
  await retry.click();
  await expect(retry).toBeVisible();
});

test("admin session is restored from the server after refresh", async ({ page }) => {
  await page.route("**/api/auth/me", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });
  await page.goto("/");
  await page.getByLabel("登录 Admin").click();
  const login = page.getByRole("dialog", { name: "登录 Argus" });
  await login.getByRole("button", { name: "使用邮箱登录" }).click();
  await expect(page.getByRole("button", { name: "退出 Admin" })).toBeVisible({ timeout: 10000 });
  await page.reload();
  await expect(page.getByRole("status", { name: "正在验证登录状态" })).toBeVisible();
  await expect(page.getByRole("button", { name: "退出 Admin" })).toBeVisible({ timeout: 10000 });
});

test("notification panel and theme controls remain reversible", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /通知/ }).click();
  const notificationPanel = page.getByRole("dialog", { name: "通知中心" });
  await expect(notificationPanel).toBeVisible();
  await notificationPanel.getByRole("button", { name: "关闭面板" }).click();
  await expect(notificationPanel).toHaveCount(0);
  await page.getByRole("button", { name: /通知/ }).click();
  await expect(notificationPanel).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "设置" }).click();
  const settings = page.getByRole("dialog", { name: "设置" });
  await settings.getByRole("radio", { name: "橄榄绿" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("olive");
  const sidebarSwitch = settings.getByRole("switch", { name: /侧栏/ });
  await sidebarSwitch.click();
  await expect(sidebarSwitch).toHaveAttribute("aria-checked", "true");
});
