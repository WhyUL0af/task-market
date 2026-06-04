"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearSession, getCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/types";

export function Nav() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  function logout() {
    clearSession();
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <nav className="nav">
      <Link href="/tasks">任務</Link>
      <Link href="/my-tasks">我的任務</Link>
      <Link href="/leaderboard">排行榜</Link>
      {user?.role === "ADMIN" ? <Link href="/users">使用者</Link> : null}
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
