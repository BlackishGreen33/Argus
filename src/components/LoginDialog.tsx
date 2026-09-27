"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { request } from "@/utils/http";

export function LoginDialog({
  onClose,
  onLogin,
}: {
  onClose: () => void;
  onLogin: (provider: string, email?: string) => void;
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
    <div className="login-overlay">
      <section className="login-card" role="dialog" aria-modal="true" aria-label="登录 Argus">
        <div className="eyebrow">Argus 登录</div>
        <h2>登录</h2>
        <p>登录后可以修改漏洞、维护组件并运行数据刷新。</p>
        {providers.email && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onLogin("email", email);
            }}
          >
            <div className="field">
              <label htmlFor="login-email">邮箱</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="login-password">密码</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <button className="primary-button" type="submit">
              使用邮箱登录
            </button>
          </form>
        )}
        <div className="divider">或使用已配置的登录方式</div>
        <div className="social-row">
          {providers.google && (
            <button className="secondary-button" onClick={() => onLogin("google", email)}>
              Google
            </button>
          )}
          {providers.github && (
            <button className="secondary-button" onClick={() => onLogin("github", email)}>
              GitHub
            </button>
          )}
          {!providers.google && !providers.github && <span className="cell-muted">Google／GitHub 尚未配置</span>}
        </div>
        <button className="icon-button" style={{ margin: "17px auto 0" }} onClick={onClose} aria-label="关闭登录">
          <X size={18} />
        </button>
      </section>
    </div>
  );
}
