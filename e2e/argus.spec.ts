import { expect, type Page, test } from "@playwright/test";
const signInAsAdmin = async (page: Page) => {
  const login = page.getByRole("dialog", { name: "登录" });
  await login.getByRole("textbox", { name: "邮箱" }).fill("admin@argus.local");
  await login.getByRole("textbox", { name: "密码" }).fill("argus-demo");
  await login.getByRole("button", { name: "登录", exact: true }).click();
};

test("guest can inspect Triage and use global search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Triage" })).toBeVisible();
  await expect(page.getByLabel("全局搜索")).toBeVisible();
  await expect(page.getByLabel("筛选当前漏洞列表")).toBeVisible();
  await expect(page.getByText("CVE-2026-9999")).toBeVisible();
  await expect(page.locator('[data-slot="checkbox"]')).toHaveCount(0);
  await expect(page.locator(".cvss").first()).toHaveAttribute("style", /--cvss-progress: 98%/);
  const firstSeverityRow = page.locator(".argus-table-row").first();
  await expect(firstSeverityRow.locator(".severity-dot")).toHaveCSS("animation-name", "none");
  await firstSeverityRow.hover();
  await expect(firstSeverityRow.locator(".severity-dot")).toHaveCSS("animation-name", "severity-heartbeat");

  await page.getByLabel("全局搜索").fill("express");
  await expect(page.getByRole("dialog", { name: "全局搜索" })).toContainText("Component");
  await page.keyboard.press("Escape");

  await page.getByLabel("筛选当前漏洞列表").fill("CVE-2026-9999");
  await expect(page.getByText("CVE-2026-9999")).toBeVisible();
  await page.getByRole("button", { name: "严重度" }).click();
  await expect(page.getByRole("option")).toHaveText(["严重", "高", "中", "低"]);
  await page.getByRole("option", { name: "严重", exact: true }).click();
  await expect(page.getByRole("button", { name: /严重度/ })).toContainText("严重");
  await expect(page.locator('[role="option"]:visible')).toHaveCount(0);
  await page.getByRole("button", { name: "清除筛选" }).click();
  await expect(page.getByRole("button", { name: /严重度/ })).toContainText("严重度");
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
  await expect(firstRow).toBeFocused();
});

test("clear filters is inert when no filter is active", async ({ page }) => {
  await page.goto("/");
  const clear = page.getByRole("button", { name: "清除筛选" });
  await expect(clear).toBeDisabled();
  await page.waitForTimeout(300);
  let cveRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/cves")) cveRequests += 1;
  });
  await clear.evaluate((element) => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForTimeout(300);
  expect(cveRequests).toBe(0);
  await expect(clear).toBeDisabled();
});

test("filter menus dismiss when clicking outside", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "严重度" }).click();
  await expect(page.locator('[role="option"]:visible')).toHaveCount(4);
  await page.mouse.click(1100, 700);
  await expect(page.locator('[role="option"]:visible')).toHaveCount(0);
});

test("search inputs expose trailing clear controls", async ({ page }) => {
  await page.goto("/");
  const global = page.locator(".global-search input");
  const globalShell = page.locator(".global-search");
  const topbar = page.locator(".topbar");
  expect((await globalShell.boundingBox())?.height).toBeCloseTo((await topbar.boundingBox())?.height ?? 0, 0);
  const globalWidthBefore = (await global.boundingBox())?.width;
  await global.fill("CVE");
  const globalDialog = page.getByRole("dialog", { name: "全局搜索" });
  const globalClear = globalDialog.getByRole("button", { name: "清空全局搜索" });
  await expect(globalClear).toBeVisible();
  expect((await global.boundingBox())?.width).toBeCloseTo(globalWidthBefore ?? 0, 1);
  await globalClear.focus();
  await expect(globalClear).toHaveCSS("outline-width", "0px");
  const commandItems = globalDialog.locator('[data-slot="command-item"]');
  await expect(commandItems.nth(1)).toBeVisible();
  const itemGap = await commandItems.nth(1).evaluate((element) => {
    const previous = element.previousElementSibling;
    if (!previous) return 0;
    const currentBox = element.getBoundingClientRect();
    const previousBox = previous.getBoundingClientRect();
    return currentBox.top - previousBox.bottom;
  });
  expect(itemGap).toBeCloseTo(4, 0);
  await globalClear.click();
  await expect(global).toHaveValue("");
  await page.keyboard.press("Escape");

  const triage = page.getByLabel("筛选当前漏洞列表");
  const triageWidthBefore = (await triage.boundingBox())?.width;
  await triage.fill("XStream");
  const triageClear = page.getByRole("button", { name: "清空漏洞筛选" });
  expect((await triage.boundingBox())?.width).toBeCloseTo(triageWidthBefore ?? 0, 1);
  await triageClear.focus();
  await expect(triageClear).toHaveCSS("outline-width", "0px");
  await triageClear.click();
  await expect(triage).toHaveValue("");

  await page.getByRole("button", { name: "Components", exact: true }).click();
  const components = page.getByLabel("筛选组件列表");
  await components.fill("pkg:");
  await page.getByRole("button", { name: "清空组件筛选" }).click();
  await expect(components).toHaveValue("");
});

test("triage search debounces rapid input", async ({ page }) => {
  await page.goto("/");
  const search = page.getByLabel("筛选当前漏洞列表");
  await expect(search).toBeVisible();
  await page.waitForTimeout(300);

  let cveRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/cves?")) cveRequests += 1;
  });

  await search.pressSequentially("CVE-2026-9999", { delay: 0 });
  await page.waitForTimeout(100);
  expect(cveRequests).toBe(0);
  await page.waitForTimeout(250);
  expect(cveRequests).toBe(1);
});

test("mobile navigation and triage rows keep their context", async ({ page }) => {
  for (const width of [320, 375, 390, 414, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const search = page.getByLabel("全局搜索");
    await expect(search).toHaveCSS("font-size", "16px");
    await expect
      .poll(() => search.evaluate((element) => getComputedStyle(element, "::placeholder").fontSize))
      .toBe("12px");
    const firstRow = page.locator(".argus-table-row").first();
    await expect(firstRow.locator("td")).toHaveCount(6);
    await expect(firstRow).toContainText("2026年6月1日");
    await expect(firstRow).toContainText("待处理");
    await expect(firstRow.locator(".cell-title strong")).toHaveCSS("white-space", "normal");
    await expect(firstRow).toHaveCSS("border-radius", "8px");
    await expect(page.locator(".argus-table tbody")).toHaveCSS("row-gap", "8px");
    await expect(firstRow).toHaveCSS("row-gap", "4px");
    await expect(page.locator(".mobile-menu")).toHaveCSS("border-width", "0px");
    await expect(page.locator(".mobile-menu")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(page.locator(".mobile-menu")).toHaveCSS("width", "44px");
    await expect(page.locator(".sidebar .footer-links")).toBeVisible();
    await page.locator(".mobile-menu").click();
    await expect(page.locator(".sidebar")).toHaveClass(/collapsed/);
    await expect(page.locator(".sidebar .nav")).toBeHidden();
    await expect(page.locator(".sidebar .wordmark > div")).toBeVisible();
    await expect(page.locator(".mobile-menu")).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".mobile-menu")).toHaveCSS("outline-style", "none");
    await page.locator(".mobile-menu").click();
    await expect(page.locator(".sidebar .nav")).toBeVisible();
    await expect(page.locator(".mobile-menu")).toHaveAttribute("aria-expanded", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
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
  await signInAsAdmin(page);
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

test("reading notifications clears the unread badge", async ({ page }) => {
  await page.route("**/api/audit-events", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: "event-1",
            action: "STATUS_CHANGED",
            cveId: "CVE-2026-9999",
            createdAt: "2026-09-26T00:00:00.000Z",
          },
          {
            id: "event-2",
            action: "IMPORT_MERGED",
            targetId: "import-1",
            createdAt: "2026-09-26T01:00:00.000Z",
          },
        ],
      }),
    });
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "通知2条" })).toBeVisible();
  await page.getByRole("button", { name: /通知/ }).click();
  const notificationPanel = page.getByRole("dialog", { name: "通知中心" });
  await expect(notificationPanel).toContainText("状态发生变化");
  await notificationPanel.getByRole("button", { name: "关闭面板" }).click();
  await expect(page.getByRole("button", { name: /通知/ })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "通知2条" })).toHaveCount(0);
});

test("theme accent updates primary actions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Components" }).click();
  const primaryAction = page.getByRole("button", { name: "新增组件" });
  await page.getByRole("button", { name: "设置" }).click();
  const settings = page.getByRole("dialog", { name: "设置" });
  await settings.getByRole("radio", { name: "陶土红" }).click();
  await expect
    .poll(() => primaryAction.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe("rgb(168, 77, 50)");
  await settings.getByRole("radio", { name: "橄榄绿" }).click();
  await expect
    .poll(() => primaryAction.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe("rgb(95, 118, 95)");
});

test("language setting updates copy and survives reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "设置" }).click();
  await page.getByRole("dialog", { name: "设置" }).getByRole("radio", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1").first()).toHaveText("Triage");
  await expect(page.locator(".global-search input")).toHaveAttribute("placeholder", "Search CVE, component, or PURL…");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".global-search input")).toHaveAttribute("placeholder", "Search CVE, component, or PURL…");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("radio", { name: "繁體中文" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-TW");
});

test("component editor keeps fields readable on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Components" }).click();
  await page.getByLabel("登录 Admin").click();
  await signInAsAdmin(page);
  await page.getByRole("button", { name: "新增组件" }).click();
  const editor = page.getByRole("dialog", { name: "新增组件" });
  await expect(editor).toBeVisible();
  const fields = editor.locator(".field:not(.full)");
  await expect
    .poll(
      async () =>
        await fields.evaluateAll((items) => items.every((field) => field.getBoundingClientRect().width >= 300)),
    )
    .toBe(true);
  const fieldRows = await fields.evaluateAll((items) =>
    items.map((field) => ({ width: field.getBoundingClientRect().width, y: field.getBoundingClientRect().y })),
  );
  expect(fieldRows.every(({ width }) => width >= 300)).toBe(true);
  expect(new Set(fieldRows.map(({ y }) => y)).size).toBe(fieldRows.length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const desktopEditor = await editor.boundingBox();
  expect(desktopEditor?.width ?? 0).toBeGreaterThan(800);
  const desktopRows = await editor
    .locator(".field:not(.full)")
    .evaluateAll((items) =>
      items.map((field) => ({ x: field.getBoundingClientRect().x, y: field.getBoundingClientRect().y })),
    );
  expect(desktopRows[0]?.y).toBeCloseTo(desktopRows[1]?.y ?? 0, 0);
  expect(desktopRows[0]?.x).toBeLessThan(desktopRows[1]?.x ?? 0);
});

test("login feedback does not block the profile control", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByLabel("登录 Admin").click();
  const login = page.getByRole("dialog", { name: "登录" });
  await expect(login.getByRole("button", { name: "关闭登录" })).toHaveCount(0);
  await expect(login.getByText("Argus 登录", { exact: true })).toHaveCount(0);
  await expect(login.getByText("或", { exact: true })).toHaveCount(0);
  const email = login.getByRole("textbox", { name: "邮箱" });
  const password = login.getByRole("textbox", { name: "密码" });
  await expect(email).toHaveValue("");
  await expect(password).toHaveValue("");
  await expect(password).toHaveAttribute("type", "password");
  await login.getByRole("button", { name: "显示密码" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await login.getByRole("button", { name: "隐藏密码" }).click();
  await page.locator('[data-slot="dialog-overlay"]').click({ position: { x: 8, y: 8 } });
  await expect(login).toHaveCount(0);
  await page.getByLabel("登录 Admin").click();
  await signInAsAdmin(page);
  const logout = page.getByLabel("退出 Admin");
  await expect(logout).toBeVisible();
  const selectedRows = page.locator('[data-slot="checkbox"]');
  await selectedRows.nth(1).click();
  await selectedRows.nth(2).click();
  await expect(page.locator('[data-slot="checkbox"][data-state="checked"]')).toHaveCount(2);
  await logout.click();
  await expect(page.getByLabel("登录 Admin")).toBeVisible();
  await expect(page.locator('[data-slot="checkbox"]')).toHaveCount(0);
});

test("component deletion asks for confirmation before changing data", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Components", exact: true }).click();
  await page.getByLabel("登录 Admin").click();
  await signInAsAdmin(page);
  await page.getByRole("button", { name: "编辑 xstream" }).click();
  const editor = page.getByRole("dialog", { name: "编辑组件" });
  await editor.getByRole("button", { name: "删除组件" }).click();
  const confirm = page.getByRole("alertdialog", { name: /删除组件/ });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "取消" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(editor).toBeVisible();
});
