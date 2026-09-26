import { expect, test } from "@playwright/test";

test("guest can inspect Triage and use global search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Triage" })).toBeVisible();
  await expect(page.getByLabel("全局搜索")).toBeVisible();
  await expect(page.getByLabel("筛选当前漏洞列表")).toBeVisible();

  await page.getByLabel("全局搜索").fill("express");
  await expect(page.getByRole("dialog", { name: "全局搜索" })).toContainText("Component");
  await page.keyboard.press("Escape");

  await page.getByLabel("筛选当前漏洞列表").fill("CVE-2026-9999");
  await expect(page.getByText("CVE-2026-9999")).toBeVisible();
  await page.getByLabel("状态").selectOption("PENDING");
  await expect(page.getByText("CVE-2026-9999")).toBeVisible();
  await page.getByText("CVE-2026-9999").click();
  await expect(page.getByRole("dialog", { name: /CVE-2026-9999 详情/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /CVE-2026-9999 详情/ })).toHaveCount(0);
});
