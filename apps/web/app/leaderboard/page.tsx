"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

type LeaderboardUser = User & {
  _count?: {
    assignedTasks: number;
  };
};

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<LeaderboardUser[]>("/users/leaderboard")
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : "讀取排行榜失敗"));
  }, []);

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <p className="page-kicker">Leaderboard</p>
          <h1>排行榜</h1>
          <p className="muted">依照員工累積 XP 排名，顯示等級、完成任務數與徽章。</p>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        {users.length === 0 ? (
          <div className="empty">目前還沒有排行榜資料。</div>
        ) : (
          <div className="list">
            {users.map((user, index) => (
              <div className={index === 0 ? "card highlight-card" : "card"} key={user.id}>
                <div className="row">
                  <div className="row" style={{ justifyContent: "flex-start" }}>
                    <span className="rank">{index + 1}</span>
                    <div>
                      <strong>{user.name}</strong>
                      <p className="muted">{user.email}</p>
                    </div>
                  </div>
                  <span className="level-badge">Lv.{user.level ?? 1}</span>
                </div>
                <div className="stat-grid">
                  <div className="stat">
                    <span className="subtle">XP</span>
                    <strong>{user.xp ?? 0}</strong>
                  </div>
                  <div className="stat">
                    <span className="subtle">完成任務</span>
                    <strong>{user._count?.assignedTasks ?? 0}</strong>
                  </div>
                  <div className="stat">
                    <span className="subtle">徽章</span>
                    <strong>{user.badges?.length ?? 0}</strong>
                  </div>
                </div>
                {user.badges && user.badges.length > 0 ? (
                  <div className="badge-strip">
                    {user.badges.map((item) => (
                      <span className="badge" key={item.badge.id}>
                        {item.badge.icon} {item.badge.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
