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
          <p className="page-kicker">My work</p>
          <h1>我的任務</h1>
          <p className="muted">集中查看你建立、申請或被指派的任務。</p>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {myTasks.length === 0 ? (
        <div className="empty">目前沒有和你相關的任務。</div>
      ) : (
        <div className="grid">
          {myTasks.map((task) => (
            <Link className="card" href={`/tasks/${task.id}`} key={task.id}>
              <div className="row">
                <span className={`badge ${statusClass(task.status)}`}>{task.status}</span>
                <span className="subtle">{task.reward ? `$${task.reward}` : "未設定預算"}</span>
              </div>
              <div>
                <h2>{task.title}</h2>
                <p className="muted">{task.description}</p>
              </div>
              <div className="meta-row">
                {task.assignee ? <span>負責人 {task.assignee.name}</span> : <span>尚未指派</span>}
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
