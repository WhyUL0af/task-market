import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Market",
  description: "Task publishing and assignment MVP"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link className="brand" href="/tasks">
              <span className="brand-mark">TM</span>
              <span>Task Market</span>
            </Link>
            <Nav />
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
