"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Badge, GamificationProfile } from "@/lib/types";

export default function AchievementsPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      return;
    }

    Promise.all([
      api<Badge[]>("/gamification/badges"),
      api<GamificationProfile>(`/gamification/profile/${user.id}`)
    ])
      .then(([badgeResult, profileResult]) => {
        setBadges(badgeResult);
        setProfile(profileResult);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "讀取成就失敗"));
  }, []);

  const earnedCodes = useMemo(
    () => new Set(profile?.badges.map((item) => item.badge.code) ?? []),
    [profile]
  );

  const stats = useMemo(() => {
    const total = badges.length;
    const earned = badges.filter((badge) => earnedCodes.has(badge.code)).length;
    return {
      total,
      earned,
      rate: total > 0 ? Math.round((earned / total) * 100) : 0
    };
  }, [badges, earnedCodes]);

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <span className="page-kicker">Achievements</span>
          <h1>成就</h1>
        </div>
        <div className="leaderboard-summary">
          <div>
            <span>已解鎖</span>
            <strong>
              {stats.earned} / {stats.total}
            </strong>
          </div>
          <div>
            <span>完成率</span>
            <strong>{stats.rate}%</strong>
          </div>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="grid">
        {badges.map((badge) => {
          const earned = earnedCodes.has(badge.code);
          return (
            <div
              className="card"
              key={badge.id}
              style={{
                background: earned
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, var(--panel) 100%)"
                  : "var(--panel)",
                borderColor: earned ? "rgba(16, 185, 129, 0.3)" : "var(--line)",
                boxShadow: earned ? "0 8px 32px rgba(16, 185, 129, 0.05)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                justifyContent: "space-between"
              }}
            >
              <div
                style={{
                  alignItems: "flex-start",
                  display: "flex",
                  gap: "12px",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 6px" }}>{badge.name}</h3>
                  <p className="muted" style={{ fontSize: "13px", lineHeight: "1.5", margin: 0 }}>
                    {badge.description || "尚未設定說明"}
                  </p>
                </div>
                <span
                  style={{
                    background: earned ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                    border: earned ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--line)",
                    borderRadius: "4px",
                    color: earned ? "#34d399" : "var(--muted)",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 8px"
                  }}
                >
                  {earned ? "已解鎖" : "未解鎖"}
                </span>
              </div>
              <div style={{ alignItems: "center", display: "flex", gap: "8px" }}>
                <span className="badge" style={{ fontSize: "11px" }}>
                  圖示：{badge.icon}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
