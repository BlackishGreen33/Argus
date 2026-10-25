import { describe, expect, it } from "vitest";

import { formatDate } from "@/utils/format";

describe("compact dates", () => {
  it("keeps year, month and day visible in every supported locale", () => {
    const value = "2026-09-26T12:00:00Z";
    expect(formatDate(value, "zh-CN")).toBe("2026/09/26");
    expect(formatDate(value, "zh-TW")).toBe("2026/09/26");
    expect(formatDate(value, "en")).toBe("09/26/2026");
    expect(formatDate(null, "zh-CN", "—")).toBe("—");
  });
});
