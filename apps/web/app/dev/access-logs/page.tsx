"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { AccessLog, AccessLogResponse, User } from "@/lib/types";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function statusClass(statusCode: number) {
  if (statusCode >= 500) {
    return "danger";
  }
  if (statusCode >= 400) {
    return "warning";
  }
  return "success";
}

export default function AccessLogsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [data, setData] = useState<AccessLogResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    setError("");
    setLoading(true);
    try {
      const result = await api<AccessLogResponse>("/dev/access-logs?limit=200");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "讀取訪問紀錄失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    if (user?.role === "ADMIN") {
      void loadLogs();
      const intervalId = window.setInterval(() => {
        void loadLogs();
      }, 20_000);

      return () => window.clearInterval(intervalId);
    } else {
      setLoading(false);
    }
  }, []);

  const latestUsers = useMemo(() => {
    const map = new Map<string, AccessLog>();
    for (const row of data?.rows ?? []) {
      if (row.userEmail && !map.has(row.userEmail)) {
        map.set(row.userEmail, row);
      }
    }
    return [...map.values()].slice(0, 8);
  }, [data]);

  if (currentUser?.role !== "ADMIN") {
    return (
      <section className="panel" style={{ padding: "40px", textAlign: "center" }}>
        <h1 style={{ fontSize: "28px" }}>訪問紀錄</h1>
        <p className="error" style={{ display: "inline-block", marginTop: "16px" }}>
          只有管理者可以查看這個頁面。
        </p>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <span className="page-kicker">Dev</span>
          <h1>訪問紀錄</h1>
        </div>
        <button className="button secondary" onClick={loadLogs} type="button">
          重新整理
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="stat-grid">
        <div className="stat">
          <span>總請求</span>
          <strong>{data?.summary.total ?? 0}</strong>
        </div>
        <div className="stat">
          <span>來源 IP</span>
          <strong>{data?.summary.uniqueIps ?? 0}</strong>
        </div>
        <div className="stat">
          <span>登入使用者</span>
          <strong>{data?.summary.authenticatedUsers ?? 0}</strong>
        </div>
      </div>

      {latestUsers.length > 0 ? (
        <section className="panel stack">
          <h2>最近登入使用者</h2>
          <div className="badge-strip">
            {latestUsers.map((row) => (
              <span className="badge" key={`${row.userEmail}-${row.id}`}>
                {row.userEmail}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel stack">
        <h2>最近請求</h2>
        {loading ? <div className="empty">讀取中...</div> : null}
        {!loading && !data?.rows.length ? <div className="empty">目前沒有紀錄。</div> : null}

        {data?.rows.length ? (
          <div className="access-log-table">
            <div className="access-log-row access-log-head">
              <span>時間</span>
              <span>使用者</span>
              <span>IP</span>
              <span>Method</span>
              <span>Path</span>
              <span>Status</span>
              <span>耗時</span>
            </div>
            {data.rows.map((row) => (
              <div className="access-log-row" key={row.id}>
                <span>{formatTime(row.createdAt)}</span>
                <span title={row.userEmail ?? ""}>{row.userEmail ?? "未登入"}</span>
                <span>{row.ip ?? "-"}</span>
                <span className="badge">{row.method}</span>
                <span className="access-log-path" title={row.path}>
                  {row.path}
                </span>
                <span className={`badge ${statusClass(row.statusCode)}`}>{row.statusCode}</span>
                <span>{row.durationMs} ms</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}
