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
  const [roleRequirementId, setRoleRequirementId] = useState("");
  const [submission, setSubmission] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [completionAwards, setCompletionAwards] = useState<
    Array<{ userId: string; name: string; exp: number; roleName?: string }>
  >([]);

  const alreadyAppliedForSelectedRole = useMemo(
    () =>
      !!task?.applications.some(
        (application) =>
          application.applicant.id === user?.id &&
          application.roleRequirement?.id === roleRequirementId
      ),
    [roleRequirementId, task, user]
  );

  const openRoleRequirements = useMemo(
    () =>
      task?.roleRequirements.filter(
        (role) => acceptedCount(task, role.id) < role.headcount
      ) ?? [],
    [task]
  );

  const loadTask = useCallback(async () => {
    try {
      setError("");
      const nextTask = await api<Task>(`/tasks/${params.id}`);
      setTask(nextTask);
      setRoleRequirementId(
        (current) =>
          current ||
          nextTask.roleRequirements.find(
            (role) => acceptedCount(nextTask, role.id) < role.headcount
          )?.id ||
          nextTask.roleRequirements[0]?.id ||
          ""
      );
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
      body: JSON.stringify({
        message,
        roleRequirementId: task?.roleRequirements.length ? roleRequirementId : undefined
      })
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

  async function allocateTask() {
    setError("");
    try {
      await api(`/tasks/${params.id}/allocate`, { method: "POST" });
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "分配任務失敗");
    }
  }

  async function completeTask() {
    setError("");
    try {
      const result = await api<{
        awards: Array<{ userId: string; name: string; exp: number; roleName?: string }>;
      }>(`/tasks/${params.id}/complete`, { method: "POST" });
      setCompletionAwards(result.awards);
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "完成任務失敗");
    }
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
    return <p className={error ? "error" : "notice"}>{error || "讀取任務中..."}</p>;
  }

  const canApply =
    user?.role === "EMPLOYEE" &&
    (task.status === "OPEN" || task.status === "APPLIED") &&
    !alreadyAppliedForSelectedRole &&
    (task.roleRequirements.length === 0 || openRoleRequirements.length > 0);
  const canSubmit =
    user?.role === "EMPLOYEE" &&
    (task.assignee?.id === user.id ||
      task.roleRequirements.some((role) => role.assignee?.id === user.id)) &&
    task.status === "IN_PROGRESS";

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <p className="page-kicker">Task detail</p>
          <h1>{task.title}</h1>
          <div className="meta-row">
            <span className={`badge ${statusClass(task.status)}`}>
              {statusLabel(task.status)}
            </span>
            <span>建立者：{task.creator.name}</span>
            <span>{task.reward ? `總預算 $${task.reward}` : "未設定預算"}</span>
            <span>{difficultyLabel(task.difficulty)}</span>
            <span className="xp-badge">總 EXP {task.xpReward}</span>
          </div>
        </div>
        {user?.role === "ADMIN" ? (
          <div className="actions">
            <button className="button secondary" type="button" onClick={allocateTask}>
              執行分配
            </button>
            <button className="button success" type="button" onClick={completeTask}>
              完成任務
            </button>
            <button className="button danger" type="button" onClick={deleteTask}>
              刪除任務
            </button>
          </div>
        ) : null}
      </div>

      <div className="split">
        <div className="stack">
          <section className="panel">
            <h2>任務說明</h2>
            <p>{task.description}</p>
            <div className="meta-row">
              {task.assignee ? <span>主要指派：{task.assignee.name}</span> : null}
              <span>申請 {task.applications.length}</span>
              <span>提交 {task.submissions.length}</span>
            </div>
          </section>

          <section className="panel stack">
            <h2>職位招募</h2>
            {task.roleRequirements.length === 0 ? (
              <div className="empty">這是一般任務，沒有分職位招募。</div>
            ) : (
              <div className="list">
                {task.roleRequirements.map((role) => (
                  <div className="record" key={role.id}>
                    <div className="row">
                      <div>
                        <strong>{role.roleTag.name}</strong>
                        <p className="muted">
                          需求 {role.headcount} 人 / 預算 {role.budgetPercent}% / XP {role.xpPercent}%
                        </p>
                        <div className="badge-strip">
                          {role.skillTags.length === 0 ? (
                            <span className="badge">不限技能</span>
                          ) : (
                            role.skillTags.map((item) => (
                              <span className="badge" key={item.skillTag.id}>
                                {item.skillTag.name}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      {acceptedCount(task, role.id) >= role.headcount ? (
                        <span className="badge">已滿額</span>
                      ) : (
                        <span className="badge status-open">招募中</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {user?.role === "ADMIN" ? (
            <section className="panel stack">
              <h2>申請審核</h2>
              {task.applications.length === 0 ? (
                <div className="empty">尚未有人申請。</div>
              ) : (
                <div className="list">
                  {task.applications.map((application) => (
                    <div className="record" key={application.id}>
                      <div className="row">
                        <div>
                          <strong>{application.applicant.name}</strong>
                          {application.roleRequirement ? (
                            <p className="muted">
                              申請職位：{application.roleRequirement.roleTag.name}
                            </p>
                          ) : null}
                          <p className="muted">{application.message || "沒有申請留言"}</p>
                        </div>
                        <span className="badge">{applicationStatusLabel(application.status)}</span>
                      </div>
                      {application.finalScore !== null && application.finalScore !== undefined ? (
                        <div className="stat-grid" style={{ marginTop: 12 }}>
                          <div className="stat">
                            <span className="subtle">技能匹配</span>
                            <strong>{application.skillMatchScore ?? 0}</strong>
                          </div>
                          <div className="stat">
                            <span className="subtle">工作量公平</span>
                            <strong>{application.workloadScore ?? 0}</strong>
                          </div>
                          <div className="stat">
                            <span className="subtle">完成率</span>
                            <strong>{application.completionRateScore ?? 0}</strong>
                          </div>
                          <div className="stat highlight-card">
                            <span className="subtle">最終分數</span>
                            <strong>{application.finalScore}</strong>
                          </div>
                          {application.status === "ACCEPTED" ? (
                            <>
                              <div className="stat">
                                <span className="subtle">分配預算</span>
                                <strong>{application.assignedBudget ?? 0}</strong>
                              </div>
                              <div className="stat">
                                <span className="subtle">分配 XP</span>
                                <strong>{application.assignedXp ?? 0}</strong>
                              </div>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                      {application.status === "PENDING" ? (
                        <div className="actions">
                          <button
                            className="button success"
                            type="button"
                            onClick={() => reviewApplication(application.id, "ACCEPTED")}
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
            <h2>成果提交</h2>
            {completionAwards.length > 0 ? (
              <div className="notice">
                {completionAwards.map((award) => (
                  <div key={`${award.userId}-${award.roleName ?? "task"}`}>
                    {award.name} 獲得 {award.exp} EXP
                    {award.roleName ? `（${award.roleName}）` : ""}
                  </div>
                ))}
              </div>
            ) : null}
            {task.submissions.length === 0 ? (
              <div className="empty">尚未提交成果。</div>
            ) : (
              <div className="list">
                {task.submissions.map((item) => (
                  <div className="record" key={item.id}>
                    <div className="row">
                      <strong>{item.employee.name}</strong>
                      <span className="badge">{submissionStatusLabel(item.status)}</span>
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
              {task.roleRequirements.length > 0 ? (
                <label className="field">
                  <span className="label">申請職位</span>
                  <select
                    className="select"
                    value={roleRequirementId}
                    onChange={(event) => setRoleRequirementId(event.target.value)}
                    required
                  >
                    {openRoleRequirements.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.roleTag.name} / {role.budgetPercent}%
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <textarea
                className="textarea"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="簡短說明你適合這個角色或任務的原因"
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
                placeholder="描述成果、連結或驗收重點"
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

function applicationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "待審核",
    APPROVED: "已核准",
    ACCEPTED: "已錄取",
    WAITLIST: "候補",
    REJECTED: "已拒絕"
  };
  return labels[status] ?? status;
}

function submissionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "待驗收",
    ACCEPTED: "已驗收",
    REJECTED: "已退回"
  };
  return labels[status] ?? status;
}

function acceptedCount(task: Task, roleRequirementId: string) {
  return task.applications.filter(
    (application) =>
      application.roleRequirement?.id === roleRequirementId &&
      application.status === "ACCEPTED"
  ).length;
}
