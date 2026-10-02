import "server-only";

import { deleteCookie, setCookie } from "hono/cookie";

import { DEFAULT_DEMO_COOKIE, DEMO_COOKIE_MAX_AGE_SECONDS } from "@/constants/auth";
import { serverMessages } from "@/i18n/server";
import { isSameOrigin, setAuthCookies } from "@/server/api/helpers";
import type { ApiApp } from "@/server/api/types";
import {
  ADMIN_EMAIL,
  authProviders,
  createOAuthUrl,
  DEMO_MODE,
  exchangeOAuthCode,
  resolveUser,
  signInWithPassword,
  signOut,
} from "@/server/auth";

export function registerAuthRoutes(app: ApiApp) {
  app.get("/auth/providers", (c) => c.json({ data: authProviders() }));

  app.get("/auth/me", async (c) => c.json({ data: await resolveUser(c.req.raw, setAuthCookies(c)) }));

  app.post("/auth/demo-login", async (c) => {
    if (!isSameOrigin(c.req.raw)) return c.json({ ok: false, error: { message: serverMessages.api.loginFailed } }, 403);
    if (!DEMO_MODE) {
      return c.json({ ok: false, error: { message: serverMessages.api.demoLoginDisabled } }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const email = typeof body.email === "string" && body.email.includes("@") ? body.email.toLowerCase() : ADMIN_EMAIL;

    setCookie(c, DEFAULT_DEMO_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DEMO_COOKIE_MAX_AGE_SECONDS,
    });

    return c.json({ data: { email, role: "admin", provider: body.provider ?? "email" } });
  });

  app.post("/auth/login", async (c) => {
    if (!isSameOrigin(c.req.raw)) return c.json({ ok: false, error: { message: serverMessages.api.loginFailed } }, 403);
    const body = (await c.req.json().catch(() => null)) as { email?: string; password?: string } | null;
    const email = body?.email?.trim().toLowerCase();

    if (!email || !body?.password) {
      return c.json({ ok: false, error: { message: serverMessages.api.emailPasswordRequired } }, 400);
    }

    if (DEMO_MODE) {
      setCookie(c, DEFAULT_DEMO_COOKIE, "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: DEMO_COOKIE_MAX_AGE_SECONDS,
      });
      return c.json({ data: { email, role: "admin", provider: "email" } });
    }

    const { data, error } = await signInWithPassword(c.req.raw, email, body.password, setAuthCookies(c));
    if (error || !data.session || !data.user.email) {
      return c.json({ ok: false, error: { message: error?.message ?? serverMessages.api.loginFailed } }, 401);
    }

    return c.json({
      data: {
        email: data.user.email,
        role: data.user.email.toLowerCase() === ADMIN_EMAIL ? "admin" : "guest",
        provider: "email",
      },
    });
  });

  app.get("/auth/oauth/:provider", async (c) => {
    const provider = c.req.param("provider");
    if (provider !== "google" && provider !== "github") {
      return c.json({ ok: false, error: { message: serverMessages.api.unsupportedProvider } }, 400);
    }

    if (!authProviders()[provider]) {
      return c.json({ ok: false, error: { message: serverMessages.api.providerNotConfigured } }, 400);
    }

    const redirectTo = new URL("/api/auth/callback", c.req.url).toString();
    const { data, error } = await createOAuthUrl(c.req.raw, provider, redirectTo, setAuthCookies(c));

    return error || !data.url
      ? c.json({ ok: false, error: { message: error?.message ?? serverMessages.api.oauthLinkFailed } }, 400)
      : c.json({ data: { url: data.url } });
  });

  app.get("/auth/callback", async (c) => {
    if (!isSameOrigin(c.req.raw)) return c.redirect("/?auth=error");
    const code = c.req.query("code");
    if (!code) return c.redirect("/?auth=error");
    const { error } = await exchangeOAuthCode(c.req.raw, code, setAuthCookies(c));
    return c.redirect(error ? "/?auth=error" : "/");
  });

  app.post("/auth/logout", async (c) => {
    if (!isSameOrigin(c.req.raw)) return c.json({ ok: false, error: { message: serverMessages.api.loginFailed } }, 403);
    deleteCookie(c, DEFAULT_DEMO_COOKIE, { path: "/" });
    await signOut(c.req.raw, setAuthCookies(c));
    return c.json({ data: { loggedOut: true } });
  });
}
