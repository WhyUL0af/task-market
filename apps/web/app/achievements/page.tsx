"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Badge, GamificationProfile } from "@/lib/types";

const badgeSymbols: Record<string, string> = {
  FIRST_TASK: "✓",
  ON_TIME_MASTER: "⏱",
  TEAM_PLAYER: "◎",
  ROLE_EXPERT: "◆",
  WEEKLY_CHALLENGER: "↻",
  RELIABLE_WORKER: "▣",
  HIGH_VALUE: "★"
};

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
            <article className={`achievement-card ${earned ? "earned" : ""}`} key={badge.id}>
              <div className="achievement-icon" aria-hidden="true">
                {badgeSymbols[badge.code] ?? badge.icon ?? "•"}
              </div>

              <div className="achievement-content">
                <div className="achievement-title-row">
                  <h3>{badge.name}</h3>
                  <span className={`achievement-state ${earned ? "earned" : ""}`}>
                    {earned ? "已解鎖" : "未解鎖"}
                  </span>
                </div>
                <p>{badge.description || "尚未設定說明"}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
