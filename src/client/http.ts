import axios from "axios";

import { type Locale, messages } from "@/i18n";

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    const response = await axios.request<T>({
      url,
      method: init?.method ?? "GET",
      data: init?.body,
      signal: init?.signal ?? undefined,
      withCredentials: true,
      headers: {
        "content-type": "application/json",
        ...Object.fromEntries(new Headers(init?.headers).entries()),
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    const payload = axios.isAxiosError(error) ? error.response?.data : null;
    const locale = (typeof document !== "undefined" ? document.documentElement.lang : "zh-CN") as Locale;
    throw new Error(
      payload?.error?.message ?? messages[locale]?.["error.request"] ?? messages["zh-CN"]["error.request"],
    );
  }
}
