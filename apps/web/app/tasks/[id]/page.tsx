"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Task, User } from "@/lib/types";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [submission, setSubmission] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const alreadyApplied = useMemo(
    () => !!task?.applications.some((application) => application.applicant.id === user?.id),
    [task, user]
  );

  const loadTask = useCallback(async () => {
    try {
      setError("");
      setTask(await api<Task>(`/tasks/${params.id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "讀取任務失敗");
    }
  }, [params.id]);

  useEffect(() => {
    setUser(getCurrentUser());
    void loadTask();
  }, [loadTask]);

  async function applyTask(event: FormEvent) {
    event.preventDefault();
    await api(`/tasks/${params.id}/applications`, {
      method: "POST",
      body: JSON.stringify({ message })
    });
    setMessage("");
    await loadTask();
  }

  async function reviewApplication(applicationId: string, status: string) {
    await api(`/tasks/${params.id}/applications/${applicationId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await loadTask();
  }

  async function submitWork(event: FormEvent) {
    event.preventDefault();
    await api(`/tasks/${params.id}/submissions`, {
      method: "POST",
      body: JSON.stringify({ content: submission })
    });
    setSubmission("");
    await loadTask();
  }

  async function reviewSubmission(submissionId: string, status: string) {
    await api(`/tasks/${params.id}/submissions/${submissionId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await loadTask();
  }

  async function deleteTask() {
    if (!window.confirm("確定要刪除這個任務嗎？")) {
      return;
    }
    await api(`/tasks/${params.id}`, { method: "DELETE" });
    router.push("/tasks");
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    await api(`/tasks/${params.id}/comments`, {
      method: "POST",
      body: JSON.stringify({ content: comment })
    });
    setComment("");
    await loadTask();
  }

  if (!task) {
    return <p className={error ? "error" : "notice"}>{error || "載入任務中..."}</p>;
  }

  const canApply =
    user?.role === "EMPLOYEE" &&
    (task.status === "OPEN" || task.status === "APPLIED") &&
    !alreadyApplied;
  const canSubmit =
    user?.role === "EMPLOYEE" &&
    task.assignee?.id === user.id &&
    task.status === "IN_PROGRESS";

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <p className="page-kicker">Task detail</p>
          <h1>{task.title}</h1>
          <div className="meta-row">
            <span className={`badge ${statusClass(task.status)}`}>{task.status}</span>
            <span>建立者 {task.creator.name}</span>
            <span>{task.reward ? `預算 $${task.reward}` : "未設定預算"}</span>
            <span>難度 {task.difficulty}</span>
            <span className="xp-badge">{task.xpReward} XP</span>
          </div>
        </div>
        {user?.role === "ADMIN" ? (
          <button className="button danger" type="button" onClick={deleteTask}>
            刪除任務
          </button>
        ) : null}
      </div>

      <div className="split">
        <div className="stack">
          <section className="panel">
            <h2>任務內容</h2>
            <p>{task.description}</p>
            <div className="meta-row">
              {task.assignee ? (
                <span>
                  負責人 {task.assignee.name} / Lv.{task.assignee.level ?? 1}
                </span>
              ) : (
                <span>尚未指派</span>
              )}
              <span>申請 {task.applications.length}</span>
              <span>提交 {task.submissions.length}</span>
            </div>
            <div className="stat-grid" style={{ marginTop: 16 }}>
              <div className="stat highlight-card">
                <span className="subtle">任務 XP</span>
                <strong>{task.xpReward}</strong>
              </div>
              <div className="stat">
                <span className="subtle">難度</span>
                <strong>{task.difficulty}</strong>
              </div>
            </div>
          </section>

          {user?.role === "ADMIN" ? (
            <section className="panel stack">
              <h2>申請審核</h2>
              {task.applications.length === 0 ? (
                <div className="empty">目前沒有申請。</div>
              ) : (
                <div className="list">
                  {task.applications.map((application) => (
                    <div className="record" key={application.id}>
                      <div className="row">
                        <div>
                          <strong>{application.applicant.name}</strong>
                          <p className="muted">{application.message || "沒有附加訊息"}</p>
                        </div>
                        <span className="badge">{application.status}</span>
                      </div>
                      {application.status === "PENDING" ? (
                        <div className="actions">
                          <button
                            className="button success"
                            type="button"
                            onClick={() => reviewApplication(application.id, "APPROVED")}
                          >
                            核准
                          </button>
                          <button
                            className="button danger"
                            type="button"
                            onClick={() => reviewApplication(application.id, "REJECTED")}
                          >
                            拒絕
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          <section className="panel stack">
            <h2>提交紀錄</h2>
            {task.submissions.length === 0 ? (
              <div className="empty">目前沒有提交紀錄。</div>
            ) : (
              <div className="list">
                {task.submissions.map((item) => (
                  <div className="record" key={item.id}>
                    <div className="row">
                      <strong>{item.employee.name}</strong>
                      <span className="badge">{item.status}</span>
                    </div>
                    <p>{item.content}</p>
                    {user?.role === "ADMIN" && item.status === "PENDING" ? (
                      <div className="actions">
                        <button
                          className="button success"
                          type="button"
                          onClick={() => reviewSubmission(item.id, "ACCEPTED")}
                        >
                          驗收
                        </button>
                        <button
                          className="button danger"
                          type="button"
                          onClick={() => reviewSubmission(item.id, "REJECTED")}
                        >
                          退回
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="stack">
          {canApply ? (
            <form className="panel form full" onSubmit={applyTask}>
              <h2>申請任務</h2>
              <textarea
                className="textarea"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="簡短說明你適合這個任務的原因"
              />
              <button className="button" type="submit">
                送出申請
              </button>
            </form>
          ) : null}

          {canSubmit ? (
            <form className="panel form full" onSubmit={submitWork}>
              <h2>提交成果</h2>
              <textarea
                className="textarea"
                value={submission}
                onChange={(event) => setSubmission(event.target.value)}
                required
                placeholder="貼上成果連結、說明或交付內容"
              />
              <button className="button" type="submit">
                提交成果
              </button>
            </form>
          ) : null}

          <form className="panel form full" onSubmit={addComment}>
            <h2>留言</h2>
            <div className="list">
              {task.comments.map((item) => (
                <div className="record" key={item.id}>
                  <strong>{item.author.name}</strong>
                  <p>{item.content}</p>
                </div>
              ))}
            </div>
            <textarea
              className="textarea"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              required
              placeholder="新增留言"
            />
            <button className="button" type="submit">
              送出留言
            </button>
          </form>
        </aside>
      </div>
    </section>
  );
}

function statusClass(status: string) {
  return `status-${status.toLowerCase().replace("_", "-")}`;
}
