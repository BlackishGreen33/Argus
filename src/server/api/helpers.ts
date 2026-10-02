import "server-only";

import type { Context } from "hono";
import { setCookie } from "hono/cookie";

import { type AppUser, isAdmin, resolveUser, type SetAuthCookies } from "@/server/auth";

export function setAuthCookies(c: Context): SetAuthCookies {
  return (cookies, headers) => {
    cookies.forEach(({ name, value, options }) => setCookie(c, name, value, options as never));
    Object.entries(headers).forEach(([name, value]) => c.header(name, value));
  };
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function requireAdmin(c: Context): Promise<AppUser | null> {
  if (!isSameOrigin(c.req.raw)) return null;
  const user = await resolveUser(c.req.raw, setAuthCookies(c));
  return isAdmin(user) ? user : null;
}
