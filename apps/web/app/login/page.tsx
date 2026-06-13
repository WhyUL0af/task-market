"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import type { User } from "@/lib/types";

type AuthResponse = {
  accessToken?: string;
  user: User;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      saveSession(result.user, result.accessToken);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗");
      setLoading(false);
    }
  }

  return (
    <section className="login-wrap">
      <div className="panel stack login-panel" style={{ gap: "28px" }}>
        <div style={{ textAlign: "center" }}>
          <div className="brand-mark" style={{ margin: "0 auto 16px", width: "48px", height: "48px", fontSize: "20px" }}>
            TM
          </div>
          <h1 style={{ fontSize: "26px", marginBottom: "4px" }}>登入任務管理系統</h1>
        </div>
        <form className="form full" onSubmit={onSubmit} style={{ gap: "20px" }}>
          <label className="field">
            <span className="label">電子郵件 (Email)</span>
            <input
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
            />
          </label>
          <label className="field">
            <span className="label">密碼</span>
            <input
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
              placeholder="請輸入密碼"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="button" type="submit" disabled={loading} style={{ width: "100%", marginTop: "8px" }}>
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
      </div>
    </section>
  );
}
