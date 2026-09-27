"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { request } from "@/utils/http";

export function LoginDialog({
  onClose,
  onLogin,
}: {
  onClose: () => void;
  onLogin: (provider: string, email?: string, password?: string) => void;
}) {
  const [email, setEmail] = useState("admin@argus.local");
  const [password, setPassword] = useState("argus-demo");
  const [providers, setProviders] = useState({ email: true, google: false, github: false });
  useEffect(() => {
    void request<{ data: typeof providers }>("/api/auth/providers")
      .then((response) => setProviders(response.data))
      .catch(() => undefined);
  }, []);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="login-card max-w-[430px]" showCloseButton={false}>
        <DialogTitle className="sr-only">登录 Argus</DialogTitle>
        <DialogDescription className="sr-only">登录后修改漏洞、维护组件并运行数据刷新。</DialogDescription>
        <div className="eyebrow">Argus 登录</div>
        <h2>登录</h2>
        <p>登录后可以修改漏洞、维护组件并运行数据刷新。</p>
        {providers.email && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onLogin("email", email, password);
            }}
          >
            <div className="field">
              <label htmlFor="login-email">邮箱</label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="login-password">密码</label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit">使用邮箱登录</Button>
          </form>
        )}
        <div className="divider">或使用已配置的登录方式</div>
        <div className="social-row">
          {providers.google && (
            <Button variant="outline" onClick={() => onLogin("google", email)}>
              Google
            </Button>
          )}
          {providers.github && (
            <Button variant="outline" onClick={() => onLogin("github", email)}>
              GitHub
            </Button>
          )}
          {!providers.google && !providers.github && <span className="cell-muted">Google／GitHub 尚未配置</span>}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="icon-button mx-auto mt-[17px]"
          onClick={onClose}
          aria-label="关闭登录"
        >
          <X size={18} />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
