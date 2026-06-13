"use client";

import { useEffect, useMemo, useState } from "react";
import { RankBadge } from "@/components/rank-badge";
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
  valueLabel: string;
  rows: ScoreRow[];
};

export default function LeaderboardPage() {
  const [monthlyExp, setMonthlyExp] = useState<ScoreRow[]>([]);
  const [completed, setCompleted] = useState<ScoreRow[]>([]);
  const [onTime, setOnTime] = useState<ScoreRow[]>([]);
  const [collaboration, setCollaboration] = useState<ScoreRow[]>([]);
  const [error, setError] = useState("");
  const [activeBoard, setActiveBoard] = useState("monthly-exp");

  useEffect(() => {
    Promise.all([
      api<ScoreRow[]>("/leaderboard/monthly-exp"),
      api<ScoreRow[]>("/leaderboard/completed-tasks"),
      api<ScoreRow[]>("/leaderboard/on-time-rate"),
      api<ScoreRow[]>("/leaderboard/collaboration")
    ])
      .then(([monthlyRows, completedRows, onTimeRows, collaborationRows]) => {
        setMonthlyExp(monthlyRows);
        setCompleted(completedRows);
        setOnTime(onTimeRows);
        setCollaboration(collaborationRows);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "讀取排行榜失敗"));
  }, []);

  const boards = useMemo<BoardConfig[]>(
    () => [
      { key: "monthly-exp", title: "本月 EXP", valueLabel: "EXP", rows: monthlyExp },
      { key: "completed", title: "完成任務", valueLabel: "件", rows: completed },
      { key: "on-time", title: "準時率", valueLabel: "%", rows: onTime },
      { key: "collaboration", title: "協作", valueLabel: "次", rows: collaboration }
    ],
    [monthlyExp, completed, onTime, collaboration]
  );

  const active = boards.find((board) => board.key === activeBoard) ?? boards[0];
  const topThree = active.rows.slice(0, 3);
  const remaining = active.rows.slice(3);

  const totalParticipants = useMemo(() => {
    return new Set(
      boards.flatMap((board) => board.rows.map((row) => getUser(row).id).filter(Boolean))
    ).size;
  }, [boards]);

  return (
    <section className="leaderboard-page stack">
      <div className="page-head">
        <div>
          <span className="page-kicker">Leaderboard</span>
          <h1>排行榜</h1>
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
          <h2>{active.title}</h2>
          <span className="badge">Top 20</span>
        </div>

        {active.rows.length === 0 ? (
          <div className="empty">目前沒有排行榜資料。</div>
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
              <div className="ranking-table" role="table" aria-label={active.title}>
                <div className="ranking-header" role="row">
                  <span>排名</span>
                  <span>成員</span>
                  <span>稱號</span>
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
        <RankBadge level={user.level ?? 1} />
      </div>
      <div>
        <h3 style={{ margin: 0 }}>{user.name ?? "未命名使用者"}</h3>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: "12px" }}>
          {user.email ?? "-"}
        </p>
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
      <span className="rank-number"># {rank}</span>
      <div>
        <strong style={{ display: "block" }}>{user.name ?? "未命名使用者"}</strong>
        <span className="muted" style={{ fontSize: "12px" }}>{user.email ?? "-"}</span>
      </div>
      <div>
        <RankBadge level={user.level ?? 1} />
      </div>
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
