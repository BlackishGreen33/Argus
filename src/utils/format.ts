export function formatDate(value?: string | null, locale = "zh-CN", emptyValue = "") {
  if (!value) return emptyValue;
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

export function statusClass(status: string) {
  return status.replaceAll("_", " ");
}
