"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

type ScoreRow = {
  user?: Pick<User, "id" | "name" | "email" | "level" | "xp">;
  id?: string;
  name?: string;
  email?: string;
  level?: number;
  xp?: number;
  score?: number;
  completed?: number;
  _count?: {
    applications?: number;
    assignedTasks?: number;
  };
};

type BoardConfig = {
  key: string;
  title: string;
  description: string;
  valueLabel: string;
  rows: ScoreRow[];
};

export default function LeaderboardPage() {
  const [monthlyExp, setMonthlyExp] = useState<ScoreRow[]>([]);
  const [completed, setCompleted] = useState<ScoreRow[]>([]);
  const [frontend, setFrontend] = useState<ScoreRow[]>([]);
  const [onTime, setOnTime] = useState<ScoreRow[]>([]);
  const [collaboration, setCollaboration] = useState<ScoreRow[]>([]);
  const [error, setError] = useState("");
  const [activeBoard, setActiveBoard] = useState("monthly-exp");

  useEffect(() => {
    Promise.all([
      api<ScoreRow[]>("/leaderboard/monthly-exp"),
      api<ScoreRow[]>("/leaderboard/completed-tasks"),
      api<ScoreRow[]>("/leaderboard/roles/前端工程師"),
      api<ScoreRow[]>("/leaderboard/on-time-rate"),
      api<ScoreRow[]>("/leaderboard/collaboration")
    ])
      .then(([monthlyRows, completedRows, roleRows, onTimeRows, collaborationRows]) => {
        setMonthlyExp(monthlyRows);
        setCompleted(completedRows);
        setFrontend(roleRows);
        setOnTime(onTimeRows);
        setCollaboration(collaborationRows);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "讀取排行榜失敗"));
  }, []);

  const boards = useMemo<BoardConfig[]>(
    () => [
      {
        key: "monthly-exp",
        title: "本月 EXP",
        description: "本月透過完成任務與挑戰取得的經驗值。",
        valueLabel: "EXP",
        rows: monthlyExp
      },
      {
        key: "completed",
        title: "完成任務",
        description: "累積完成並通過驗收的任務數。",
        valueLabel: "件",
        rows: completed
      },
      {
        key: "frontend",
        title: "前端職位",
        description: "前端工程師職位的完成紀錄。",
        valueLabel: "次",
        rows: frontend
      },
      {
        key: "on-time",
        title: "準時率",
        description: "已完成任務中準時完成的比例。",
        valueLabel: "%",
        rows: onTime
      },
      {
        key: "collaboration",
        title: "協作",
        description: "多人任務中的參與完成紀錄。",
        valueLabel: "次",
        rows: collaboration
      }
    ],
    [monthlyExp, completed, frontend, onTime, collaboration]
  );

  const active = boards.find((board) => board.key === activeBoard) ?? boards[0];
  const topThree = active.rows.slice(0, 3);
  const remaining = active.rows.slice(3);
  const totalParticipants = new Set(
    boards.flatMap((board) => board.rows.map((row) => getUser(row).id).filter(Boolean))
  ).size;

  return (
    <section className="leaderboard-page stack">
      <div className="leaderboard-head">
        <div>
          <p className="page-kicker">Leaderboard</p>
          <h1>排行榜</h1>
          <p className="muted">
            排行榜只用來展示參與成果，不會影響任務錄取與分配。
          </p>
        </div>
        <div className="leaderboard-summary">
          <div>
            <span>參與人數</span>
            <strong>{totalParticipants}</strong>
          </div>
          <div>
            <span>榜單</span>
            <strong>{boards.length}</strong>
          </div>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="board-tabs" role="tablist" aria-label="排行榜分類">
        {boards.map((board) => (
          <button
            aria-selected={active.key === board.key}
            className={active.key === board.key ? "board-tab active" : "board-tab"}
            key={board.key}
            onClick={() => setActiveBoard(board.key)}
            role="tab"
            type="button"
          >
            <span>{board.title}</span>
            <strong>{board.rows.length}</strong>
          </button>
        ))}
      </div>

      <section className="leaderboard-board">
        <div className="board-title-row">
          <div>
            <h2>{active.title}</h2>
            <p className="muted">{active.description}</p>
          </div>
          <span className="badge">前 20 名</span>
        </div>

        {active.rows.length === 0 ? (
          <div className="empty">目前還沒有排行榜資料</div>
        ) : (
          <>
            <div className="podium-grid">
              {topThree.map((row, index) => (
                <RankCard
                  key={getUser(row).id ?? `${active.key}-${index}`}
                  rank={index + 1}
                  row={row}
                  valueLabel={active.valueLabel}
                />
              ))}
            </div>

            {remaining.length > 0 ? (
              <div className="ranking-table" role="table" aria-label={`${active.title}排行榜`}>
                <div className="ranking-header" role="row">
                  <span>排名</span>
                  <span>成員</span>
                  <span>等級</span>
                  <span>分數</span>
                </div>
                {remaining.map((row, index) => (
                  <RankingRow
                    key={getUser(row).id ?? `${active.key}-row-${index}`}
                    rank={index + 4}
                    row={row}
                    valueLabel={active.valueLabel}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>
    </section>
  );
}

function RankCard({
  rank,
  row,
  valueLabel
}: {
  rank: number;
  row: ScoreRow;
  valueLabel: string;
}) {
  const user = getUser(row);
  const score = getScore(row);

  return (
    <article className={`rank-card rank-${rank}`}>
      <div className="rank-card-top">
        <span className="rank-medal">{rank}</span>
        <span className="level-badge">Lv.{user.level ?? "-"}</span>
      </div>
      <div>
        <h3>{user.name ?? "未命名成員"}</h3>
        <p className="muted">{user.email ?? "沒有 email"}</p>
      </div>
      <strong className="rank-score">
        {score}
        <span>{valueLabel}</span>
      </strong>
    </article>
  );
}

function RankingRow({
  rank,
  row,
  valueLabel
}: {
  rank: number;
  row: ScoreRow;
  valueLabel: string;
}) {
  const user = getUser(row);
  const score = getScore(row);

  return (
    <div className="ranking-row" role="row">
      <span className="rank-number">{rank}</span>
      <div>
        <strong>{user.name ?? "未命名成員"}</strong>
        <p className="muted">{user.email ?? "沒有 email"}</p>
      </div>
      <span className="level-badge">Lv.{user.level ?? "-"}</span>
      <span className="score-pill">
        {score} {valueLabel}
      </span>
    </div>
  );
}

function getUser(row: ScoreRow) {
  return row.user ?? row;
}

function getScore(row: ScoreRow) {
  return row.score ?? row.completed ?? row._count?.applications ?? row._count?.assignedTasks ?? 0;
}
