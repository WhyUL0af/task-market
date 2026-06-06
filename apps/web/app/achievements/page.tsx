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

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <p className="page-kicker">Achievements</p>
          <h1>成就徽章</h1>
          <p className="muted">查看已解鎖與尚未解鎖的任務成就。</p>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="grid">
        {badges.map((badge) => {
          const earned = earnedCodes.has(badge.code);
          return (
            <div className={earned ? "card highlight-card" : "card"} key={badge.id}>
              <div className="row">
                <strong>{badge.name}</strong>
                <span className="badge">{earned ? "已解鎖" : "未解鎖"}</span>
              </div>
              <p className="muted">{badge.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
