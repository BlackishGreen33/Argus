import { createClient } from "@supabase/supabase-js";

export type AppUser = {
  email: string;
  role: "guest" | "admin";
  provider?: string;
};

export const DEMO_MODE = process.env.DEMO_MODE !== "false";
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@argus.local").toLowerCase();

export function authProviders() {
  return {
    email: true,
    google: process.env.AUTH_GOOGLE_ENABLED === "true",
    github: process.env.AUTH_GITHUB_ENABLED === "true",
  };
}

function supabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = supabaseAuthClient();
  if (!supabase) return { data: null, error: new Error("Supabase Auth is not configured") };
  return supabase.auth.signInWithPassword({ email, password });
}

export async function createOAuthUrl(provider: "google" | "github", redirectTo: string) {
  const supabase = supabaseAuthClient();
  if (!supabase) return { data: null, error: new Error("Supabase Auth is not configured") };
  return supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
}

export async function resolveUser(request: Request): Promise<AppUser> {
  const demoCookie = request.headers.get("cookie")?.includes("argus_demo_admin=1");
  if (DEMO_MODE && demoCookie) {
    return { email: ADMIN_EMAIL, role: "admin", provider: "demo" };
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (token) {
    const supabase = supabaseAuthClient();
    if (!supabase) return { email: "guest@argus.local", role: "guest" };
    const { data } = await supabase.auth.getUser(token);
    const email = data.user?.email?.toLowerCase();
    if (email) {
      return { email, role: email === ADMIN_EMAIL ? "admin" : "guest" };
    }
  }

  return { email: "guest@argus.local", role: "guest" };
}

export function isAdmin(user: AppUser) {
  return user.role === "admin";
}
