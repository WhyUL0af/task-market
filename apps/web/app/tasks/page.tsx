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
      .catch((err) => setError(err instanceof Error ? err.message : "讀取失敗"));
  }, []);

  return (
    <section className="stack">
      <div className="row">
        <div>
          <h1>任務列表</h1>
          <p className="muted">查看可申請任務與目前任務狀態。</p>
        </div>
        {user?.role === "ADMIN" ? (
          <Link className="button" href="/tasks/new">
            新增任務
          </Link>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="grid">
        {tasks.map((task) => (
          <Link className="card" href={`/tasks/${task.id}`} key={task.id}>
            <span className="badge">{task.status}</span>
            <h2>{task.title}</h2>
            <p className="muted">{task.description}</p>
            <p>{task.reward ? `預算 ${task.reward}` : "未設定預算"}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
