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
    () =>
      !!task?.applications.some(
        (application) => application.applicant.id === user?.id
      ),
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
    return <p className={error ? "error" : "muted"}>{error || "載入中..."}</p>;
  }

  return (
    <section className="stack">
      <div className="panel stack">
        <div className="row">
          <div>
            <span className="badge">{task.status}</span>
            <h1>{task.title}</h1>
            <p className="muted">建立者：{task.creator.name}</p>
          </div>
          {user?.role === "ADMIN" ? (
            <button className="button danger" type="button" onClick={deleteTask}>
              刪除
            </button>
          ) : null}
        </div>
        <p>{task.description}</p>
        <p>{task.reward ? `預算 ${task.reward}` : "未設定預算"}</p>
        {task.assignee ? <p>指派給：{task.assignee.name}</p> : null}
      </div>

      {user?.role === "EMPLOYEE" &&
      (task.status === "OPEN" || task.status === "APPLIED") &&
      !alreadyApplied ? (
        <form className="panel form" onSubmit={applyTask}>
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

      {user?.role === "EMPLOYEE" &&
      task.assignee?.id === user.id &&
      task.status === "IN_PROGRESS" ? (
        <form className="panel form" onSubmit={submitWork}>
          <h2>提交成果</h2>
          <textarea
            className="textarea"
            value={submission}
            onChange={(event) => setSubmission(event.target.value)}
            required
            placeholder="貼上成果連結、說明或交付內容"
          />
          <button className="button" type="submit">
            提交
          </button>
        </form>
      ) : null}

      {user?.role === "ADMIN" ? (
        <div className="panel stack">
          <h2>申請列表</h2>
          {task.applications.map((application) => (
            <div className="card" key={application.id}>
              <div className="row">
                <strong>{application.applicant.name}</strong>
                <span className="badge">{application.status}</span>
              </div>
              <p className="muted">{application.message || "沒有附加訊息"}</p>
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
      ) : null}

      <div className="panel stack">
        <h2>提交紀錄</h2>
        {task.submissions.map((item) => (
          <div className="card" key={item.id}>
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

      <form className="panel form" onSubmit={addComment}>
        <h2>留言</h2>
        {task.comments.map((item) => (
          <p key={item.id}>
            <strong>{item.author.name}</strong>：{item.content}
          </p>
        ))}
        <textarea
          className="textarea"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          required
        />
        <button className="button" type="submit">
          新增留言
        </button>
      </form>
    </section>
  );
}
