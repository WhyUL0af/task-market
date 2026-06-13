"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import type { WeeklyChallenge } from "@/lib/types";

export default function WeeklyChallengesPage() {
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<WeeklyChallenge[]>("/gamification/challenges/weekly")
      .then(setChallenges)
      .catch((err) => setError(err instanceof Error ? err.message : "讀取挑戰失敗"));
  }, []);

  const stats = useMemo(() => {
    const total = challenges.length;
    const completed = challenges.filter((c) => c.completed).length;
    return {
      total,
      completed,
      reward: challenges.reduce((sum, c) => sum + (c.completed ? c.expReward : 0), 0)
    };
  }, [challenges]);

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <span className="page-kicker">Weekly Challenges</span>
          <h1>每週挑戰</h1>
        </div>
        <div className="leaderboard-summary">
          <div>
            <span>完成挑戰</span>
            <strong>{stats.completed} / {stats.total}</strong>
          </div>
          <div>
            <span>獲得獎勵</span>
            <strong style={{ color: "var(--primary)" }}>+{stats.reward} EXP</strong>
          </div>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        {challenges.map((challenge) => {
          const percent =
            challenge.target > 0
              ? Math.min(100, (challenge.progress / challenge.target) * 100)
              : 0;
          return (
            <div
              className="card"
              key={challenge.id}
              style={{
                display: "grid",
                gap: "18px",
                borderColor: challenge.completed ? "rgba(99, 102, 241, 0.3)" : "var(--line)",
                background: challenge.completed
                  ? "linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, var(--panel) 100%)"
                  : "var(--panel)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: "18px" }}>{challenge.title}</h2>
                  <p className="muted" style={{ margin: 0, fontSize: "14px" }}>
                    {challenge.description || "完成該挑戰以獲取冒險者經驗值"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className="xp-badge">+{challenge.expReward} EXP</span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "99px",
                      background: challenge.completed ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                      color: challenge.completed ? "#34d399" : "var(--muted)",
                      border: challenge.completed ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--line)"
                    }}
                  >
                    {challenge.completed ? "已完成" : "進行中"}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gap: "8px" }}>
                <div className="progress" style={{ height: "10px" }}>
                  <span style={{ width: `${percent}%` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }} className="muted">
                  <span>進度: {challenge.progress} / {challenge.target}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
