import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type ParsedComponent = {
  purl: string;
  cpe: string | null;
  type: string | null;
  vendor: string | null;
  name: string;
  version: string;
  license: string | null;
  description: string | null;
  repository: string | null;
  publishDate: string | null;
  language: string | null;
  recordTime: string | null;
};

export type ParsedCve = {
  sourceId: string;
  sourceName: string | null;
  sourcePublishDate: string | null;
  sourceUpdateDate: string | null;
  sourceLink: string | null;
  affectedVersion: string | null;
  cvssScoreV4: number | null;
  cvssScoreV3: number | null;
  cvssScoreV2: number | null;
  severity: string | null;
  type: string | null;
  cweId: string | null;
  description: string | null;
  cveId: string;
  title: string | null;
};

function sourceArray(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [value];
  } catch {
    return [value];
  }
}

export function findCandidateComponents(cve: ParsedCve, components: ParsedComponent[]) {
  const sourceCpes = sourceArray(cve.affectedVersion).map((item) => item.toLowerCase());
  return components.filter((component) => {
    const cpe = component.cpe?.toLowerCase();
    return Boolean(cpe && sourceCpes.some((source) => source.startsWith(cpe) || cpe.startsWith(source)));
  });
}

function unescapeSql(value: string): string {
  return value
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

function splitValues(input: string): Array<string | null> {
  const values: Array<string | null> = [];
  let current = "";
  let quoted = false;
  let escaped = false;

  for (const char of input) {
    if (escaped) {
      current += `\\${char}`;
      escaped = false;
      continue;
    }
    if (quoted && char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "'") {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      values.push(normalizeValue(current));
      current = "";
      continue;
    }
    current += char;
  }

  values.push(normalizeValue(current));
  return values;
}

function normalizeValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === "NULL") return null;
  return unescapeSql(trimmed);
}

function readInsertRows(sql: string): string[][] {
  const rows: string[][] = [];
  const insertPattern = /INSERT\s+INTO[\s\S]*?VALUES\s*\(/gi;
  let match: RegExpExecArray | null;

  while ((match = insertPattern.exec(sql))) {
    const start = insertPattern.lastIndex;
    let index = start;
    let quoted = false;
    let escaped = false;
    let depth = 1;

    for (; index < sql.length; index += 1) {
      const char = sql[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (quoted && char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "'") {
        quoted = !quoted;
        continue;
      }
      if (!quoted && char === "(") depth += 1;
      if (!quoted && char === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }

    if (depth !== 0) break;
    rows.push(splitValues(sql.slice(start, index)) as string[]);
    insertPattern.lastIndex = index + 1;
  }

  return rows;
}

function numberOrNull(value: string | null): number | null {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseComponents(sql: string): ParsedComponent[] {
  return readInsertRows(sql).map((row) => ({
    purl: row[0] ?? "",
    cpe: row[1] ?? null,
    type: row[2] ?? null,
    vendor: row[3] ?? null,
    name: row[4] ?? "",
    version: row[5] ?? "",
    license: row[6] ?? null,
    description: row[7] ?? null,
    repository: row[8] ?? null,
    publishDate: row[9] ?? null,
    language: row[10] ?? null,
    recordTime: row[11] ?? null,
  }));
}

export function parseCves(sql: string): ParsedCve[] {
  return readInsertRows(sql).map((row) => ({
    sourceId: row[0] ?? "",
    sourceName: row[1] ?? null,
    sourcePublishDate: row[2] ?? null,
    sourceUpdateDate: row[3] ?? null,
    sourceLink: row[4] ?? null,
    affectedVersion: row[5] ?? null,
    cvssScoreV4: numberOrNull(row[6] ?? null),
    cvssScoreV3: numberOrNull(row[7] ?? null),
    cvssScoreV2: numberOrNull(row[8] ?? null),
    severity: row[9] ?? null,
    type: row[10] ?? null,
    cweId: row[11] ?? null,
    description: row[12] ?? null,
    cveId: row[13] ?? "",
    title: row[14] ?? null,
  }));
}

export async function loadSourceData() {
  const [componentSql, cveSql] = await Promise.all([
    readFile(path.join(process.cwd(), "data", "source", "comp.sql"), "utf8"),
    readFile(path.join(process.cwd(), "data", "source", "vul.sql"), "utf8"),
  ]);

  return {
    components: parseComponents(componentSql),
    cves: parseCves(cveSql),
    checksum: createHash("sha256").update(componentSql).update(cveSql).digest("hex"),
  };
}
