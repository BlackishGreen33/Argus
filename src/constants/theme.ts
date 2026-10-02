export const THEME_OPTIONS = [
  { id: "terracotta", key: "settings.theme.terracotta" },
  { id: "olive", key: "settings.theme.olive" },
  { id: "graphite", key: "settings.theme.graphite" },
] as const;

export type ThemeAccent = (typeof THEME_OPTIONS)[number]["id"];
