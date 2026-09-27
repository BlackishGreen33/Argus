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
  await page.getByRole("button", { name: "状态" }).click();
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
