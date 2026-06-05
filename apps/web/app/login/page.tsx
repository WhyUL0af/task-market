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
    <section className="split">
      <div className="panel stack">
        <div>
          <p className="page-kicker">Sign in</p>
          <h1>登入任務管理系統</h1>
          <p className="muted">使用管理員或員工帳號進入工作台。</p>
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
      <aside className="panel stack">
        <h2>帳號由後台建立</h2>
        <p className="muted">
          公開註冊已關閉。請由 Admin 在使用者管理頁新增員工帳號。
        </p>
        <div className="record">
          <strong>Admin</strong>
          <p className="muted">發布任務、審核申請、驗收成果。</p>
        </div>
        <div className="record">
          <strong>Employee</strong>
          <p className="muted">申請任務、查看指派、提交成果。</p>
        </div>
      </aside>
    </section>
  );
}
