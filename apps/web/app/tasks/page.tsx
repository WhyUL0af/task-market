"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TaskBrowser } from "@/components/task-browser";
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
          <span className="page-kicker">Tasks</span>
          <h1>任務</h1>
        </div>
        {user?.role === "ADMIN" ? (
          <Link className="button" href="/tasks/new">
            新增任務
          </Link>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}
      <TaskBrowser tasks={tasks} emptyText="目前沒有任務。" />
    </section>
  );
}
