"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, getCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/types";

export function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]); // Update user status when navigating

  async function logout() {
    try {
      await api<{ ok: boolean }>("/auth/logout", { method: "POST" });
    } finally {
      clearSession();
      setUser(null);
      window.location.href = "/login";
    }
  }

  function isActive(path: string) {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname === path || (path !== "/" && pathname.startsWith(`${path}/`));
  }

  return (
    <nav className="nav">
      <Link href="/tasks" className={isActive("/tasks") ? "active" : ""}>
        任務
      </Link>

      <Link href="/my-tasks" className={isActive("/my-tasks") ? "active" : ""}>
        我的任務
      </Link>

      <Link href="/leaderboard" className={isActive("/leaderboard") ? "active" : ""}>
        排行榜
      </Link>

      <Link href="/achievements" className={isActive("/achievements") ? "active" : ""}>
        成就
      </Link>

      <Link href="/weekly-challenges" className={isActive("/weekly-challenges") ? "active" : ""}>
        每週挑戰
      </Link>

      {user ? (
        <Link href="/profile" className={isActive("/profile") ? "active" : ""}>
          個人資料
        </Link>
      ) : null}

      {user?.role === "ADMIN" ? (
        <Link href="/users" className={isActive("/users") ? "active" : ""}>
          使用者管理
        </Link>
      ) : null}

      {user?.role === "ADMIN" ? (
        <Link href="/profile-tags" className={isActive("/profile-tags") ? "active" : ""}>
          標籤管理
        </Link>
      ) : null}

      {user ? (
        <button className="link-button" type="button" onClick={logout}>
          登出
        </button>
      ) : (
        <Link href="/login" className={pathname === "/login" ? "active" : ""}>
          登入
        </Link>
      )}
    </nav>
  );
}
