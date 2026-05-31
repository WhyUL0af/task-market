"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import type { User } from "@/lib/types";

type AuthResponse = {
  accessToken: string;
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
      saveSession(result.accessToken, result.user);
      window.location.href = "/tasks";
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗");
    }
  }

  return (
    <section className="panel">
      <h1>登入</h1>
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">Email</span>
          <input
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
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
            required
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <div className="actions">
          <button className="button" type="submit">
            登入
          </button>
          <Link className="button secondary" href="/register">
            建立帳號
          </Link>
        </div>
      </form>
    </section>
  );
}
