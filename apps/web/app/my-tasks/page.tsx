"use client";

import { useEffect, useMemo, useState } from "react";
import { TaskBrowser } from "@/components/task-browser";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Task, User } from "@/lib/types";

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setUser(getCurrentUser());
    api<Task[]>("/tasks")
      .then(setTasks)
      .catch((err) => setError(err instanceof Error ? err.message : "讀取任務失敗"));
  }, []);

  const myTasks = useMemo(() => {
    if (!user) {
      return [];
    }
    return tasks.filter((task) => {
      if (user.role === "ADMIN") {
        return task.creator.id === user.id;
      }
      return (
        task.assignee?.id === user.id ||
        task.applications.some((application) => application.applicant.id === user.id)
      );
    });
  }, [tasks, user]);

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <span className="page-kicker">My Tasks</span>
          <h1>我的任務</h1>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      <TaskBrowser tasks={myTasks} emptyText="目前沒有任務。" />
    </section>
  );
}
