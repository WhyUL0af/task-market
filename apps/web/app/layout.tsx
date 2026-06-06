import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yuloaf Works",
  description: "Task publishing and assignment workspace"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="shell">
          <AuthShell>{children}</AuthShell>
        </div>
      </body>
    </html>
  );
}
