"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, getCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/types";

export function Nav() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  async function logout() {
    try {
      await api<{ ok: boolean }>("/auth/logout", { method: "POST" });
    } finally {
      clearSession();
      setUser(null);
      window.location.href = "/login";
    }
  }

  return (
    <nav className="nav">
      <Link href="/tasks">任務</Link>
      <Link href="/my-tasks">我的任務</Link>
      <Link href="/leaderboard">排行榜</Link>
      <Link href="/achievements">成就</Link>
      <Link href="/weekly-challenges">每週挑戰</Link>
      {user ? <Link href="/profile">個人設定</Link> : null}
      {user?.role === "ADMIN" ? <Link href="/users">使用者</Link> : null}
      {user?.role === "ADMIN" ? <Link href="/profile-tags">標籤管理</Link> : null}
      {user ? (
        <button className="link-button" type="button" onClick={logout}>
          登出
        </button>
      ) : (
        <Link href="/login">登入</Link>
      )}
    </nav>
  );
}
