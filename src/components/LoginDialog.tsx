"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";

import { request } from "@/client/http";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";

interface LoginDialogProps {
  loading: boolean;
  onClose: () => void;
  onLogin: (provider: string, email?: string, password?: string) => void;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({ loading, onClose, onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [providers, setProviders] = useState({ email: true, google: false, github: false });
  const hasSocialProvider = providers.google || providers.github;
  useEffect(() => {
    void request<{ data: typeof providers }>("/api/auth/providers")
      .then((response) => setProviders(response.data))
      .catch(() => undefined);
  }, []);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="login-card" showCloseButton={false}>
        <DialogTitle className="sr-only">{t("auth.login.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("auth.login.description")}</DialogDescription>
        <h2>{t("auth.login.title")}</h2>
        <p>{t("auth.login.description")}</p>
        {providers.email && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onLogin("email", email, password);
            }}
          >
            <div className="field">
              <label htmlFor="login-email">{t("auth.login.email")}</label>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="login-password">{t("auth.login.password")}</label>
              <div className="password-field-control">
                <Input
                  id="login-password"
                  className="login-password-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={t(showPassword ? "auth.login.hidePassword" : "auth.login.showPassword")}
                  aria-pressed={showPassword}
                  title={t(showPassword ? "auth.login.hidePassword" : "auth.login.showPassword")}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 size={15} className="spin" aria-hidden="true" />}
              {loading ? t("auth.login.submitting") : t("auth.login.submit")}
            </Button>
          </form>
        )}
        {hasSocialProvider && (
          <>
            <div className="divider">{t("auth.login.or")}</div>
            <div className="social-row">
              {providers.google && (
                <Button variant="outline" disabled={loading} onClick={() => onLogin("google", email)}>
                  {t("auth.login.google")}
                </Button>
              )}
              {providers.github && (
                <Button variant="outline" disabled={loading} onClick={() => onLogin("github", email)}>
                  {t("auth.login.github")}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
