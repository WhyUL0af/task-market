"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, getCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/types";

const commonLinks = [
  { href: "/tasks", label: "任務" },
  { href: "/my-tasks", label: "我的任務" },
  { href: "/leaderboard", label: "排行榜" },
  { href: "/achievements", label: "成就" },
  { href: "/weekly-challenges", label: "每週挑戰" }
];

const adminLinks = [
  { href: "/users", label: "使用者管理" },
  { href: "/dev/access-logs", label: "訪問紀錄" }
];

export function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]);

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
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  return (
    <nav className="nav">
      {commonLinks.map((link) => (
        <Link className={isActive(link.href) ? "active" : ""} href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}

      {user ? (
        <Link className={isActive("/profile") ? "active" : ""} href="/profile">
          個人設定
        </Link>
      ) : null}

      {user?.role === "ADMIN"
        ? adminLinks.map((link) => (
            <Link
              className={isActive(link.href) ? "active" : ""}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))
        : null}

      {user ? (
        <button className="link-button" onClick={logout} type="button">
          登出
        </button>
      ) : (
        <Link className={pathname === "/login" ? "active" : ""} href="/login">
          登入
        </Link>
      )}
    </nav>
  );
}
