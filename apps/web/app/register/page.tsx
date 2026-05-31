"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Role, User } from "@/lib/types";

export default function RegisterPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [error, setError] = useState("");
  const [createdUsers, setCreatedUsers] = useState<User[]>([]);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const user = await api<User>("/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role })
      });
      setCreatedUsers((users) => [user, ...users]);
      setName("");
      setEmail("");
      setPassword("");
      setRole("EMPLOYEE");
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增使用者失敗");
    }
  }

  if (currentUser?.role !== "ADMIN") {
    return (
      <section className="panel">
        <h1>新增使用者</h1>
        <p className="error">只有 Admin 可以從後台建立帳號。</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h1>新增使用者</h1>
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">名稱</span>
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
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
          <span className="label">密碼（至少 8 碼）</span>
          <input
            className="input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            minLength={8}
            required
          />
        </label>
        <label className="field">
          <span className="label">角色</span>
          <select
            className="select"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="button" type="submit">
          建立帳號
        </button>
      </form>
      {createdUsers.length > 0 ? (
        <div className="stack" style={{ marginTop: 24 }}>
          <h2>剛建立的帳號</h2>
          {createdUsers.map((user) => (
            <div className="card" key={user.id}>
              <strong>{user.name}</strong>
              <span className="muted">
                {user.email} / {user.role}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
