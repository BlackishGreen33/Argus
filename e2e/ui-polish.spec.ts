import { expect, type Locator, type Page, test } from "@playwright/test";

async function adminSession(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: { email: "admin@argus.local", password: "argus-demo" },
  });
  expect(response.ok()).toBe(true);
}

async function componentsPage(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) <= 840) {
    await page.getByRole("button", { name: "展开导航" }).click();
  }
  await page.getByRole("button", { name: "Components", exact: true }).click();
}

async function expectTouchTarget(locator: Locator) {
  await expect
    .poll(async () => {
      const box = (await locator.boundingBox())!;
      return Math.min(box.width, box.height);
    })
    .toBeGreaterThanOrEqual(44);
}

test("shared button geometry survives trigger slots and selected filters", async ({ page }) => {
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await componentsPage(page);
    const input = page.getByRole("textbox", { name: "筛选组件列表" });
    const refresh = page.getByRole("button", { name: "刷新", exact: true });
    const type = page.getByRole("button", { name: "按组件类型筛选" });
    for (const control of [input, refresh, type]) {
      expect((await control.boundingBox())!.height).toBeCloseTo(width <= 840 ? 44 : 40, 1);
      await expect(control).toHaveCSS("border-radius", "8px");
    }
    await type.click();
    await page.getByRole("menuitemradio", { name: "Maven", exact: true }).click();
    const active = page.locator('[data-filter-active="true"]');
    await expect(active).toContainText("maven");
    expect((await active.boundingBox())!.height).toBeCloseTo(width <= 840 ? 44 : 40, 1);
    await expect(page.locator(".component-date-cell").first()).toHaveText("2026/09/26");
    expect(
      await page
        .locator(".component-date-cell")
        .first()
        .evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
});

test("mobile first screen shows data and keeps command search separate", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await adminSession(page);
  await page.goto("/");
  await expect(page.locator(".sidebar")).toHaveClass(/collapsed/);
  await expect(page.getByRole("button", { name: "展开导航" })).toBeVisible();
  const rows = page.locator(".argus-table-row");
  await expect(rows.nth(1)).toBeVisible();
  expect((await rows.first().boundingBox())!.y).toBeLessThanOrEqual(360);
  const second = (await rows.nth(1).boundingBox())!;
  expect(second.y + second.height).toBeLessThanOrEqual(844);
  const local = page.getByRole("textbox", { name: "筛选当前漏洞列表" });
  await local.fill("XStream");
  await page.getByRole("button", { name: "打开全局搜索" }).click();
  const command = page.getByRole("dialog", { name: "全局搜索", exact: true });
  await command.getByRole("combobox").fill("express");
  await expect(command).toContainText("Component");
  await page.keyboard.press("Escape");
  await expect(local).toHaveValue("XStream");
});

test("drawer controls and inline delete confirmation have non-overlapping touch targets", async ({ page }) => {
  await adminSession(page);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page.getByRole("row", { name: /查看 CVE-2026-9999/ }).click();
    const drawer = page.locator(".argus-drawer-sheet");
    const copy = drawer.locator('[data-slot="copy-button"]');
    const close = drawer.getByRole("button", { name: "关闭", exact: true });
    for (const control of [
      copy,
      close,
      ...(await drawer.getByRole("tab").all()),
      ...(await drawer.locator(".status-choice").all()),
    ]) {
      await expectTouchTarget(control);
    }
    const copyBox = (await copy.boundingBox())!;
    const closeBox = (await close.boundingBox())!;
    expect(copyBox.x + copyBox.width).toBeLessThanOrEqual(closeBox.x);
    await expect(drawer.locator(".drawer-delete-action")).toContainText("删除漏洞");
    const remove = drawer.getByRole("button", { name: "删除漏洞", exact: true });
    await expectTouchTarget(remove);
    await remove.click();
    const confirm = drawer.getByRole("button", { name: "确认删除漏洞" });
    const cancel = drawer.getByRole("button", { name: "取消删除" });
    await expectTouchTarget(confirm);
    await expectTouchTarget(cancel);
    const confirmBox = (await confirm.boundingBox())!;
    const cancelBox = (await cancel.boundingBox())!;
    expect(confirmBox.x + confirmBox.width).toBeLessThanOrEqual(cancelBox.x);
    await cancel.click();
    await expect(remove).toBeFocused();
    await close.click();
  }
});

test("editor owns padding once and readonly PURL stays selectable", async ({ page }) => {
  await adminSession(page);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await componentsPage(page);
    await page.getByRole("button", { name: "编辑 xstream", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "编辑组件", exact: true });
    await expect(editor).toHaveCSS("padding", "0px");
    for (const section of [".editor-header", ".editor-form"]) {
      await expect(editor.locator(section)).toHaveCSS("padding-left", width <= 840 ? "16px" : "24px");
    }
    const purl = editor.getByRole("textbox", { name: "PURL" });
    await expect(purl).toBeEnabled();
    await expect(purl).toHaveAttribute("readonly", "");
    await expect(purl).toHaveCSS("opacity", "1");
    const name = editor.getByRole("textbox", { name: "名称", exact: true });
    await name.fill("unsaved-name");
    await editor.getByRole("button", { name: "删除组件", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "取消", exact: true }).click();
    await expect(name).toHaveValue("unsaved-name");
    await expect(purl).toHaveValue("pkg:maven/com.thoughtworks.xstream/xstream@1.4.20");
    await editor.getByRole("button", { name: "关闭组件表单" }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
});

test("identity text is readable in all themes and clicking it cannot log out", async ({ page }) => {
  await adminSession(page);
  await page.goto("/");
  const profile = page.locator(".profile-chip");
  await profile.getByText("Admin", { exact: true }).click();
  await expect(page.getByRole("button", { name: "退出 Admin" })).toBeVisible();
  await expect(profile).toHaveCSS("min-height", "48px");
  for (const theme of ["陶土红", "橄榄绿", "石墨灰"]) {
    await page.getByRole("button", { name: "设置", exact: true }).click();
    await page.getByRole("radio", { name: theme }).click();
    await page.keyboard.press("Escape");
    const ratio = await profile.evaluate((node) => {
      const email = node.querySelector(".profile-copy > span")!;
      const linear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
      const luminance = (color: string) => {
        const rgb = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((value) => linear(value / 255));
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const foreground = luminance(getComputedStyle(email).color);
      const background = luminance(getComputedStyle(node).backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    await expect(profile.locator(".profile-copy > span")).toHaveCSS("font-size", "12px");
  }
});
