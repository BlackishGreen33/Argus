import { describe, expect, it } from "vitest";

import { loadSourceData, parseComponents, parseCves } from "@/libs/parser";

describe("bundled SQL parser", () => {
  it("loads the assignment dataset with stable record counts", async () => {
    const source = await loadSourceData();

    expect(source.components).toHaveLength(398);
    expect(source.cves).toHaveLength(1000);
    expect(source.components[0]).toMatchObject({
      purl: "pkg:7-zip/7-zip",
      vendor: "7-zip",
    });
    expect(source.cves[0]).toMatchObject({
      cveId: "CVE-2026-9999",
      cvssScoreV3: 8.8,
      severity: "HIGH",
    });
    expect(source.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps commas, escaped quotes, newlines and JSON-like source fields intact", () => {
    const components = parseComponents(
      String.raw`INSERT INTO tmp_comp VALUES ('pkg:npm/acme/demo@1.0.0','cpe:2.3:a:acme:demo','npm','acme','demo','1.0.0',NULL,'A comma, then \'quoted\' text\nnext','https://example.com',NULL,'JavaScript','2026-01-01 00:00:00');`,
    );
    const cves = parseCves(
      String.raw`INSERT INTO tmp_vul VALUES ('SRC-1','NVD','2026-01-01','2026-01-02','https://nvd.example','["< 2.0"]',NULL,7.5,NULL,'HIGH',NULL,'["CWE-20"]','description, with comma','CVE-1','Title');`,
    );

    expect(components[0]).toMatchObject({
      description: "A comma, then 'quoted' text\nnext",
      language: "JavaScript",
    });
    expect(cves[0]).toMatchObject({
      affectedVersion: '["< 2.0"]',
      cweId: '["CWE-20"]',
      description: "description, with comma",
      cvssScoreV3: 7.5,
    });
  });
});
