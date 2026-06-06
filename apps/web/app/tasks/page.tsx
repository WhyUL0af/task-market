"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Task, User } from "@/lib/types";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setUser(getCurrentUser());
    api<Task[]>("/tasks")
      .then(setTasks)
      .catch((err) => setError(err instanceof Error ? err.message : "讀取任務失敗"));
  }, []);

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <p className="page-kicker">Workspace</p>
          <h1>任務工作台</h1>
          <p className="muted">查看可申請職位、審核進度與目前執行中的任務。</p>
        </div>
        {user?.role === "ADMIN" ? (
          <Link className="button" href="/tasks/new">
            新增任務
          </Link>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}

      {tasks.length === 0 ? (
        <div className="empty">目前沒有任務。</div>
      ) : (
        <div className="grid">
          {tasks.map((task) => (
            <Link className="card" href={`/tasks/${task.id}`} key={task.id}>
              <div className="row">
                <span className={`badge ${statusClass(task.status)}`}>
                  {statusLabel(task.status)}
                </span>
                <span className="xp-badge">{task.xpReward} XP</span>
              </div>
              <div>
                <h2>{task.title}</h2>
                <p className="muted">{task.description}</p>
              </div>
              <div className="meta-row">
                {task.roleRequirements?.length ? (
                  <span>職位 {task.roleRequirements.length}</span>
                ) : null}
                <span>申請 {task.applications.length}</span>
                <span>提交 {task.submissions.length}</span>
                <span>{difficultyLabel(task.difficulty)}</span>
                {task.assignee ? <span>負責人 {task.assignee.name}</span> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function statusClass(status: string) {
  return `status-${status.toLowerCase().replace("_", "-")}`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "草稿",
    OPEN: "招募中",
    APPLIED: "審核中",
    IN_PROGRESS: "執行中",
    REVIEW: "待驗收",
    DONE: "已完成",
    CANCELLED: "已取消"
  };
  return labels[status] ?? status;
}

function difficultyLabel(difficulty: string) {
  const labels: Record<string, string> = {
    EASY: "低難度",
    MEDIUM: "中等難度",
    HARD: "高難度"
  };
  return labels[difficulty] ?? difficulty;
}
