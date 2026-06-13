"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/types";
import { Nav } from "./nav";

const publicPaths = new Set(["/login"]);

export function AuthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const isPublicPath = publicPaths.has(pathname);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setReady(true);

    if (!currentUser && !isPublicPath) {
      router.replace("/login");
    }

    if (currentUser && pathname === "/login") {
      router.replace("/tasks");
    }
  }, [isPublicPath, pathname, router]);

  if (!ready) {
    return (
      <main className="main">
        <p className="notice">Loading...</p>
      </main>
    );
  }

  if (!user && !isPublicPath) {
    return (
      <main className="main">
        <p className="notice">請先登入。</p>
      </main>
    );
  }

  if (isPublicPath) {
    return <main className="main auth-main">{children}</main>;
  }

  return (
    <>
      <header className="topbar">
        <Link className="brand" href="/tasks">
          <span className="brand-mark">TM</span>
          <span>Task Market</span>
        </Link>
        <Nav />
      </header>
      <main className="main">{children}</main>
    </>
  );
}
