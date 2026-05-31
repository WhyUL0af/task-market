"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
      .catch((err) => setError(err instanceof Error ? err.message : "讀取失敗"));
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
        task.applications.some(
          (application) => application.applicant.id === user.id
        )
      );
    });
  }, [tasks, user]);

  return (
    <section className="stack">
      <div>
        <h1>我的任務</h1>
        <p className="muted">查看你建立、申請或被指派的任務。</p>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="grid">
        {myTasks.map((task) => (
          <Link className="card" href={`/tasks/${task.id}`} key={task.id}>
            <span className="badge">{task.status}</span>
            <h2>{task.title}</h2>
            <p className="muted">{task.description}</p>
            {task.assignee ? <p>指派給：{task.assignee.name}</p> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
