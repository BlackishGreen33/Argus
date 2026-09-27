export type Page = "triage" | "components" | "overview";
export type DrawerTab = "Overview" | "Impact" | "History";
export type GlobalResult = { type: "CVE" | "Component"; label: string; sublabel: string; target: string };

export type CveFilters = {
  severity: string;
  status: string;
  ecosystem: string;
};
