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
          <p className="page-kicker">Tasks</p>
          <h1>任務列表</h1>
          <p className="muted">查看開放任務、申請狀態與目前執行進度。</p>
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
                  {task.status}
                </span>
                <span className="subtle">{task.reward ? `$${task.reward}` : "未設定預算"}</span>
              </div>
              <div>
                <h2>{task.title}</h2>
                <p className="muted">{task.description}</p>
              </div>
              <div className="meta-row">
                <span>申請 {task.applications.length}</span>
                <span>提交 {task.submissions.length}</span>
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
