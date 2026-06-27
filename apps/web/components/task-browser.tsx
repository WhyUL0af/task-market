"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ProfileTag, Task } from "@/lib/types";

type TaskBrowserProps = {
  tasks: Task[];
  emptyText: string;
};

type Category = "ALL" | "OPEN" | "APPLIED" | "IN_PROGRESS" | "REVIEW" | "DONE";
type DifficultyFilter = "ALL" | "EASY" | "MEDIUM" | "HARD";
type SortKey = "NEWEST" | "EXP_DESC" | "REWARD_DESC" | "APPLICATIONS_DESC";

const pageSize = 6;

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  APPLIED: "Applied",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
  CANCELLED: "Cancelled"
};

const difficultyLabels: Record<string, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard"
};

const categoryTabs: Array<{ key: Category; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "APPLIED", label: "Applied" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "REVIEW", label: "Review" },
  { key: "DONE", label: "Done" }
];

const statusClassMap: Record<string, string> = {
  OPEN: "task-card-status-open",
  IN_PROGRESS: "task-card-status-in-progress",
  APPLIED: "task-card-status-applied",
  REVIEW: "task-card-status-review",
  DONE: "task-card-status-done",
  DRAFT: "task-card-status-draft",
  CANCELLED: "task-card-status-draft"
};

const difficultyClassMap: Record<string, string> = {
  EASY: "task-card-diff-easy",
  MEDIUM: "task-card-diff-medium",
  HARD: "task-card-diff-hard"
};

export function TaskBrowser({ tasks, emptyText }: TaskBrowserProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("ALL");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("NEWEST");
  const [page, setPage] = useState(1);

  const filteredTasks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return tasks
      .filter((task) => {
        const matchesQuery =
          !keyword ||
          task.title.toLowerCase().includes(keyword) ||
          task.description.toLowerCase().includes(keyword) ||
          taskSkills(task).some((skill) => skill.name.toLowerCase().includes(keyword));
        const matchesCategory = category === "ALL" || task.status === category;
        const matchesDifficulty = difficulty === "ALL" || task.difficulty === difficulty;
        return matchesQuery && matchesCategory && matchesDifficulty;
      })
      .sort((a, b) => {
        if (sortKey === "EXP_DESC") {
          return b.xpReward - a.xpReward;
        }
        if (sortKey === "REWARD_DESC") {
          return (b.reward ?? 0) - (a.reward ?? 0);
        }
        if (sortKey === "APPLICATIONS_DESC") {
          return b.applications.length - a.applications.length;
        }
        return b.id.localeCompare(a.id);
      });
  }, [category, difficulty, query, sortKey, tasks]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [category, difficulty, query, sortKey]);

  return (
    <section className="stack">
      <div className="task-toolbar panel">
        <label className="field task-search">
          <span className="label">搜尋</span>
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <label className="field task-filter">
          <span className="label">難度</span>
          <select
            className="select"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as DifficultyFilter)}
          >
            <option value="ALL">全部</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </label>

        <label className="field task-sort">
          <span className="label">排序</span>
          <select
            className="select"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
          >
            <option value="NEWEST">最新建立</option>
            <option value="EXP_DESC">EXP 最高</option>
            <option value="REWARD_DESC">預算最高</option>
            <option value="APPLICATIONS_DESC">申請最多</option>
          </select>
        </label>
      </div>

      <div className="task-tabs" role="tablist" aria-label="任務分類">
        {categoryTabs.map((tab) => {
          const count =
            tab.key === "ALL"
              ? tasks.length
              : tasks.filter((task) => task.status === tab.key).length;
          return (
            <button
              aria-selected={category === tab.key}
              className={category === tab.key ? "task-tab active" : "task-tab"}
              key={tab.key}
              onClick={() => setCategory(tab.key)}
              role="tab"
              type="button"
            >
              <span>{tab.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>

      {pageTasks.length === 0 ? (
        <div className="empty">{tasks.length === 0 ? emptyText : "沒有符合條件的任務。"}</div>
      ) : (
        <>
          <div className="grid">
            {pageTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>

          <div className="pagination">
            <span>
              第 {currentPage} / {totalPages} 頁，共 {filteredTasks.length} 筆
            </span>
            <div className="actions">
              <button
                className="button secondary"
                disabled={currentPage === 1}
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                上一頁
              </button>
              <button
                className="button secondary"
                disabled={currentPage === totalPages}
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                下一頁
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function TaskCard({ task }: { task: Task }) {
  const skills = taskSkills(task);
  const acceptedCount = task.applications.filter((item) => item.status === "ACCEPTED").length;
  const requirementCount = task.requirements.reduce((total, item) => total + item.headcount, 0);

  return (
    <Link className={`card task-card task-card-${task.difficulty.toLowerCase()}`} href={`/tasks/${task.id}`}>
      <div className="task-card-body">
        <div className="task-card-top">
          <div className="task-card-badge-group">
            <span className={`task-card-status-badge ${statusClassMap[task.status] ?? "task-card-status-draft"}`}>
              <span className="status-dot"></span>
              {statusLabels[task.status] ?? task.status}
            </span>
            <span className={`task-card-diff-badge ${difficultyClassMap[task.difficulty] ?? "task-card-diff-medium"}`}>
              {difficultyLabels[task.difficulty] ?? task.difficulty}
            </span>
          </div>
          <div className="task-card-reward-group">
            {task.reward ? (
              <span className="task-card-reward-chip task-card-reward-budget">
                <svg className="chip-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                NT${task.reward.toLocaleString()}
              </span>
            ) : null}
            <span className="task-card-reward-chip task-card-reward-xp">
              <svg className="chip-icon" fill="currentColor" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {task.xpReward} EXP
            </span>
          </div>
        </div>

        <div className="task-card-main">
          <h2 className="task-card-title">{task.title}</h2>
          {task.description ? <p className="task-card-desc">{task.description}</p> : null}
        </div>

        {skills.length ? (
          <div className="task-skill-row">
            {skills.slice(0, 4).map((skill) => (
              <span className="task-skill-chip" key={skill.id}>
                {skill.name}
              </span>
            ))}
            {skills.length > 4 ? <span className="task-skill-chip">+{skills.length - 4}</span> : null}
          </div>
        ) : null}
      </div>

      <div className="task-card-footer">
        <span className="task-card-footer-item">
          <svg className="footer-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {task.applications.length} 申請
        </span>
        {requirementCount > 0 ? (
          <span className="task-card-footer-item">
            <svg className="footer-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {acceptedCount}/{requirementCount} 已錄取
          </span>
        ) : null}
        <span className="task-card-footer-item">
          <svg className="footer-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {task.dueAt ? `截止 ${formatDateTime(task.dueAt)}` : "無期限"}
        </span>
      </div>
    </Link>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function taskSkills(task: Task): ProfileTag[] {
  const skills = task.requirements.flatMap((requirement) =>
    requirement.skills.map((item) => item.skillTag)
  );
  return Array.from(new Map(skills.map((skill) => [skill.id, skill])).values());
}
