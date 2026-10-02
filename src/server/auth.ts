import "server-only";

import { type CookieOptions, createServerClient } from "@supabase/ssr";

import { DEFAULT_ADMIN_EMAIL, DEFAULT_DEMO_COOKIE } from "@/constants/auth";
import { serverMessages } from "@/i18n/server";

export type AppUser = {
  email: string;
  role: "guest" | "admin";
  provider?: string;
};

type CookieToSet = { name: string; value: string; options: CookieOptions };
export type SetAuthCookies = (cookies: CookieToSet[], headers: Record<string, string>) => void | Promise<void>;

export const DEMO_MODE = process.env.DEMO_MODE === "true";
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).toLowerCase();

export function authProviders() {
  return {
    email: true,
    google: process.env.AUTH_GOOGLE_ENABLED === "true",
    github: process.env.AUTH_GITHUB_ENABLED === "true",
  };
}

function supabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

function requestCookies(request: Request) {
  return (request.headers.get("cookie") ?? "")
    .split(";")
    .filter(Boolean)
    .map((item) => {
      const separator = item.indexOf("=");
      const name = item.slice(0, separator).trim();
      const rawValue = item.slice(separator + 1).trim();
      try {
        return { name, value: decodeURIComponent(rawValue) };
      } catch {
        return { name, value: rawValue };
      }
    });
}

export function createAuthClient(request: Request, setAll?: SetAuthCookies) {
  const { url, key } = supabaseConfig();
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: {
      getAll: () => requestCookies(request),
      setAll: async (cookies, headers) => {
        await setAll?.(cookies, headers);
      },
    },
  });
}

export async function signInWithPassword(request: Request, email: string, password: string, setAll: SetAuthCookies) {
  const supabase = createAuthClient(request, setAll);
  if (!supabase) return { data: null, error: new Error(serverMessages.api.supabaseAuthNotConfigured) };
  return supabase.auth.signInWithPassword({ email, password });
}

export async function createOAuthUrl(
  request: Request,
  provider: "google" | "github",
  redirectTo: string,
  setAll: SetAuthCookies,
) {
  const supabase = createAuthClient(request, setAll);
  if (!supabase) return { data: null, error: new Error(serverMessages.api.supabaseAuthNotConfigured) };
  return supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
}

export async function exchangeOAuthCode(request: Request, code: string, setAll: SetAuthCookies) {
  const supabase = createAuthClient(request, setAll);
  if (!supabase) return { data: null, error: new Error(serverMessages.api.supabaseAuthNotConfigured) };
  return supabase.auth.exchangeCodeForSession(code);
}

export async function signOut(request: Request, setAll: SetAuthCookies) {
  const supabase = createAuthClient(request, setAll);
  if (supabase) await supabase.auth.signOut({ scope: "local" });
}

export async function resolveUser(request: Request, setAll?: SetAuthCookies): Promise<AppUser> {
  const demoCookie = request.headers.get("cookie")?.includes(`${DEFAULT_DEMO_COOKIE}=1`);
  if (DEMO_MODE && demoCookie) return { email: ADMIN_EMAIL, role: "admin", provider: "demo" };

  const supabase = createAuthClient(request, setAll);
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email?.toLowerCase();
    if (email) return { email, role: email === ADMIN_EMAIL ? "admin" : "guest" };
  }
  return { email: "guest@argus.local", role: "guest" };
}

export function isAdmin(user: AppUser) {
  return user.role === "admin";
}
