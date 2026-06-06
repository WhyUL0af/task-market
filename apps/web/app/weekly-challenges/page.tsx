"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { WeeklyChallenge } from "@/lib/types";

export default function WeeklyChallengesPage() {
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<WeeklyChallenge[]>("/gamification/challenges/weekly")
      .then(setChallenges)
      .catch((err) => setError(err instanceof Error ? err.message : "讀取每週挑戰失敗"));
  }, []);

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <p className="page-kicker">Weekly</p>
          <h1>每週挑戰</h1>
          <p className="muted">完成挑戰可獲得額外 EXP 與成就徽章。</p>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="grid">
        {challenges.map((challenge) => {
          const percent = Math.min(100, (challenge.progress / challenge.target) * 100);
          return (
            <div className={challenge.completed ? "card highlight-card" : "card"} key={challenge.id}>
              <div className="row">
                <strong>{challenge.title}</strong>
                <span className="xp-badge">+{challenge.expReward} EXP</span>
              </div>
              <p className="muted">{challenge.description}</p>
              <div className="progress">
                <span style={{ width: `${percent}%` }} />
              </div>
              <div className="row">
                <span className="muted">
                  {challenge.progress} / {challenge.target}
                </span>
                <span className="badge">{challenge.completed ? "已完成" : "進行中"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
