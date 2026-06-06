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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await api<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      saveSession(result.user, result.accessToken);
      window.location.href = "/tasks";
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗");
    }
  }

  return (
    <section className="login-wrap">
      <div className="panel stack login-panel">
        <div>
          <p className="page-kicker">Sign in</p>
          <h1>登入任務管理系統</h1>
        </div>
        <form className="form full" onSubmit={onSubmit}>
          <label className="field">
            <span className="label">Email</span>
            <input
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
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
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="button" type="submit">
            登入
          </button>
        </form>
      </div>
    </section>
  );
}
