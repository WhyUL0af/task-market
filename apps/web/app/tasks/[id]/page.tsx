"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Task, TaskApplication, TaskSubmission, User } from "@/lib/types";

const taskStatusLabels: Record<string, string> = {
  DRAFT: "草稿",
  OPEN: "招募中",
  APPLIED: "已申請",
  IN_PROGRESS: "進行中",
  REVIEW: "驗收中",
  DONE: "已完成",
  CANCELLED: "已取消"
};

const applicationStatusLabels: Record<string, string> = {
  PENDING: "待審核",
  APPROVED: "已核准",
  ACCEPTED: "已錄取",
  WAITLIST: "候補",
  REJECTED: "已拒絕"
};

const submissionStatusLabels: Record<string, string> = {
  PENDING: "待驗收",
  ACCEPTED: "已驗收",
  REJECTED: "退回修改"
};

const difficultyLabels: Record<string, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard"
};

const statusClassMap: Record<string, string> = {
  OPEN: "task-card-status-open",
  APPLIED: "task-card-status-open",
  IN_PROGRESS: "task-card-status-in-progress",
  REVIEW: "task-card-status-review",
  DONE: "task-card-status-done",
  DRAFT: "task-card-status-draft",
  CANCELLED: "task-card-status-draft"
};

type MemberStatus = {
  className: string;
  label: string;
  mark: string;
};

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [selectedRequirementId, setSelectedRequirementId] = useState("");
  const [submission, setSubmission] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [completionAwards, setCompletionAwards] = useState<
    Array<{ userId: string; name: string; exp: number }>
  >([]);

  const loadTask = useCallback(async () => {
    try {
      setError("");
      const nextTask = await api<Task>(`/tasks/${params.id}`);
      setTask(nextTask);
    } catch (err) {
      setError(err instanceof Error ? err.message : "讀取任務失敗");
    }
  }, [params.id]);

  useEffect(() => {
    setUser(getCurrentUser());
    void loadTask();
  }, [loadTask]);

  useEffect(() => {
    if (!task || selectedRequirementId) {
      return;
    }
    const availableRequirement = task.requirements.find(
      (requirement) => acceptedCountForRequirement(task, requirement.id) < requirement.headcount
    );
    setSelectedRequirementId(availableRequirement?.id ?? "");
  }, [selectedRequirementId, task]);

  const acceptedApplications = useMemo(
    () => task?.applications.filter((application) => application.status === "ACCEPTED") ?? [],
    [task]
  );
  const acceptedApplicationForMe = useMemo(
    () =>
      task?.applications.find(
        (application) =>
          application.applicant.id === user?.id && application.status === "ACCEPTED"
      ),
    [task, user]
  );

  const alreadyAppliedForTask = useMemo(
    () => !!task?.applications.some((application) => application.applicant.id === user?.id),
    [task, user]
  );

  const canApply =
    !!task &&
    user?.role === "EMPLOYEE" &&
    (task.status === "OPEN" || task.status === "APPLIED") &&
    !alreadyAppliedForTask;

  const canSubmit =
    !!task &&
    user?.role === "EMPLOYEE" &&
    !!acceptedApplicationForMe &&
    (task.status === "IN_PROGRESS" || task.status === "REVIEW") &&
    !task.submissions.some(
      (item) => item.employee.id === user.id && item.status === "PENDING"
    );

  const overallProgress = task ? calculateOverallProgress(task, acceptedApplications) : 0;
  const isClosed = task?.status === "DONE";
  const canCloseTask = !!task && canCloseTaskWithRewards(task, acceptedApplications);

  async function applyTask(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api(`/tasks/${params.id}/applications`, {
        method: "POST",
        body: JSON.stringify({
          message,
          requirementId: selectedRequirementId || undefined
        })
      });
      setMessage("");
      setSelectedRequirementId("");
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "申請任務失敗");
    }
  }

  async function reviewApplication(applicationId: string, status: string) {
    setError("");
    try {
      await api(`/tasks/${params.id}/applications/${applicationId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "審核申請失敗");
    }
  }

  async function completeTask() {
    setError("");
    try {
      const result = await api<{
        awards: Array<{ userId: string; name: string; exp: number }>;
      }>(`/tasks/${params.id}/complete`, { method: "POST" });
      setCompletionAwards(result.awards);
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "任務結案失敗");
    }
  }

  async function submitWork(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api(`/tasks/${params.id}/submissions`, {
        method: "POST",
        body: JSON.stringify({ content: submission })
      });
      setSubmission("");
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交成果失敗");
    }
  }

  async function reviewSubmission(submissionId: string, status: string) {
    setError("");
    try {
      await api(`/tasks/${params.id}/submissions/${submissionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "驗收成果失敗");
    }
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
    setError("");
    try {
      await api(`/tasks/${params.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: comment })
      });
      setComment("");
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "留言失敗");
    }
  }

  if (!task) {
    return <p className={error ? "error" : "notice"}>{error || "讀取任務中..."}</p>;
  }

  return (
    <section className="tm-detail">
      <div className="page-head">
        <div className="tm-detail-title-block">
          <span className="page-kicker">任務詳細資訊</span>
          <h1>{task.title}</h1>
          <div className="tm-chip-row">
            <span className={`task-card-status-badge ${statusClassMap[task.status] ?? "task-card-status-draft"}`}>
              {taskStatusLabels[task.status] ?? task.status}
            </span>
            <span className="tm-muted-chip">{difficultyLabels[task.difficulty] ?? task.difficulty}</span>
          </div>
        </div>

        {user?.role === "ADMIN" ? (
          <div className="tm-action-row">
            <button
              className="button success"
              type="button"
              onClick={completeTask}
              disabled={isClosed || !canCloseTask}
            >
              任務結案
            </button>
            <button className="button danger" type="button" onClick={deleteTask}>
              刪除
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}
      {completionAwards.length > 0 ? (
        <div className="tm-award-banner">
          已發放獎勵：{completionAwards.map((award) => `${award.name} +${award.exp} EXP`).join("、")}
        </div>
      ) : null}

      <section className="tm-reward-grid">
        <RewardCard icon="$" label="預算" value={task.reward ? `NT$${task.reward.toLocaleString()}` : "未設定"} />
        <RewardCard icon="*" label="EXP 獎勵" value={`${task.xpReward} EXP`} />
        <RewardCard icon="T" label="截止時間" value={deadlineLabel(task.dueAt)} />
      </section>

      <div className="tm-detail-grid">
        <main className="tm-main-column">
          <section className="tm-card tm-card-spacious">
            <div className="tm-section-head">
              <h2>任務說明</h2>
            </div>
            <div className="tm-description">{task.description}</div>
          </section>

          <section className="tm-card tm-card-spacious">
            <div className="tm-section-head">
              <h2>任務資訊</h2>
            </div>

            <div className="tm-creator-card">
              <UserAvatar user={task.creator} />
              <div>
                <strong>{task.creator.name}</strong>
                <span>{task.creator.email}</span>
              </div>
            </div>

            <div className="field">
              <span className="label">招募需求</span>
              {task.requirements.length === 0 ? null : (
                <div className="tm-requirement-list">
                  {task.requirements.map((requirement, index) => {
                    const acceptedCount = acceptedCountForRequirement(task, requirement.id);
                    const progress = Math.min(
                      100,
                      Math.round((acceptedCount / requirement.headcount) * 100)
                    );
                    return (
                      <article className="tm-requirement-item" key={requirement.id}>
                        <div className="tm-requirement-top">
                          <strong>{requirement.name || `需求 ${index + 1}`}</strong>
                          <span>
                            {acceptedCount}/{requirement.headcount}
                          </span>
                        </div>
                        <div className="tm-progress-track">
                          <div className="tm-progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="tm-chip-row">
                          <span className="badge">預算 {requirement.budgetPercent}%</span>
                          <span className="badge">EXP {requirement.xpPercent}%</span>
                        </div>
                        {requirement.skills.length ? (
                          <div className="badge-strip">
                            {requirement.skills.map((item) => (
                              <span className="badge" key={item.id}>
                                {item.skillTag.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

          </section>

          <section className="tm-card tm-card-spacious">
            <div className="tm-section-head">
              <h2>已錄取人員</h2>
            </div>
            <div className="tm-member-groups">
              <MemberGroup
                applications={acceptedApplications}
                availableSlots={0}
                groupName="已錄取人員"
              />
            </div>
          </section>

          <section className="tm-card tm-card-spacious">
            <div className="tm-section-head tm-section-head-inline">
              <h2>成員進度</h2>
              <strong className="tm-progress-number">{overallProgress}%</strong>
            </div>
            <div className="tm-progress-track tm-progress-track-large">
              <div className="tm-progress-fill" style={{ width: `${overallProgress}%` }} />
            </div>

            <div className="tm-progress-groups">
              <ProgressGroup applications={acceptedApplications} groupName="已錄取人員" task={task} />
            </div>
          </section>

          <section className="tm-card tm-card-spacious">
            <div className="tm-section-head">
              <h2>提交紀錄</h2>
            </div>
            {task.submissions.length === 0 ? (
              <div className="tm-empty">目前沒有提交紀錄。</div>
            ) : (
              <div className="tm-submission-list">
                {submissionHistory(task).map((item) => (
                  <article className="tm-submission-item" key={item.submission.id}>
                    <div className="tm-submission-top">
                      <div>
                        <strong>{item.employee.name}</strong>
                        <span>{item.version} · {submissionStatusLabels[item.submission.status]}</span>
                      </div>
                      <span className={`task-detail-status-pill ${submissionPillClass(item.submission.status)}`}>
                        {submissionStatusLabels[item.submission.status]}
                      </span>
                    </div>
                    <p>{item.submission.content}</p>
                    {user?.role === "ADMIN" && item.submission.status === "PENDING" && !isClosed ? (
                      <div className="tm-action-row">
                        <button
                          className="task-detail-btn task-detail-btn-success"
                          type="button"
                          onClick={() => reviewSubmission(item.submission.id, "ACCEPTED")}
                        >
                          驗收
                        </button>
                        <button
                          className="task-detail-btn task-detail-btn-danger"
                          type="button"
                          onClick={() => reviewSubmission(item.submission.id, "REJECTED")}
                        >
                          退回
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="tm-side-column">
          <section className="tm-card">
            <h2>操作</h2>
            <div className="tm-side-actions">
              {canApply ? (
                <form className="tm-action-form" onSubmit={applyTask}>
                  {task.requirements.length > 0 ? (
                    <label className="field">
                      <span className="label">申請需求</span>
                      <select
                        className="select"
                        value={selectedRequirementId}
                        onChange={(event) => setSelectedRequirementId(event.target.value)}
                        required
                      >
                        {task.requirements.map((requirement, index) => {
                          const acceptedCount = acceptedCountForRequirement(task, requirement.id);
                          const full = acceptedCount >= requirement.headcount;
                          return (
                            <option disabled={full} key={requirement.id} value={requirement.id}>
                              {requirement.name || `需求 ${index + 1}`} - {acceptedCount}/
                              {requirement.headcount}
                              {full ? "（已滿）" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  ) : null}
                  <label className="field">
                    <span className="label">申請訊息</span>
                    <textarea
                      className="task-detail-form-textarea"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                    />
                  </label>
                  <button className="task-detail-btn task-detail-btn-primary" type="submit">
                    申請加入
                  </button>
                </form>
              ) : null}

              {alreadyAppliedForTask && user?.role === "EMPLOYEE" ? (
                <div className="tm-note">你已經申請過這個任務。</div>
              ) : null}

              {canSubmit ? (
                <form className="tm-action-form" onSubmit={submitWork}>
                  <label className="field">
                    <span className="label">成果內容</span>
                    <textarea
                      className="task-detail-form-textarea"
                      value={submission}
                      onChange={(event) => setSubmission(event.target.value)}
                      required
                    />
                  </label>
                  <button className="task-detail-btn task-detail-btn-primary" type="submit">
                    {hasPreviousSubmission(task, user) ? "更新提交" : "提交成果"}
                  </button>
                </form>
              ) : null}

              {isClosed ? <div className="tm-note">任務已結案，提交已鎖定。</div> : null}
            </div>
          </section>

          {user?.role === "ADMIN" ? (
            <section className="tm-card">
              <h2>申請審核</h2>
              {task.applications.length === 0 ? (
                <div className="tm-empty">目前沒有申請。</div>
              ) : (
                <div className="tm-application-list">
                  {task.applications.map((application) => (
                    <article className="tm-application-item" key={application.id}>
                      <div>
                        <strong>{application.applicant.name}</strong>
                        <span>{application.applicant.email}</span>
                      </div>
                      <span className={`task-detail-status-pill ${applicationPillClass(application.status)}`}>
                        {applicationStatusLabels[application.status] ?? application.status}
                      </span>
                      {application.requirement ? (
                        <p className="muted">
                          申請需求：{requirementLabel(task, application.requirement.id)}
                        </p>
                      ) : null}
                      {application.skillMatchScore !== null &&
                      application.skillMatchScore !== undefined ? (
                        <p className="muted">技能匹配度：{application.skillMatchScore}%</p>
                      ) : null}
                      {application.assignedBudget || application.assignedXp ? (
                        <p className="muted">
                          分配：NT${(application.assignedBudget ?? 0).toLocaleString()} /{" "}
                          {application.assignedXp ?? 0} EXP
                        </p>
                      ) : null}
                      {application.message ? <p>{application.message}</p> : null}
                      {application.status === "PENDING" ? (
                        <div className="tm-action-row">
                          <button
                            className="task-detail-btn task-detail-btn-success"
                            type="button"
                            onClick={() => reviewApplication(application.id, "ACCEPTED")}
                          >
                            錄取
                          </button>
                          <button
                            className="task-detail-btn task-detail-btn-danger"
                            type="button"
                            onClick={() => reviewApplication(application.id, "REJECTED")}
                          >
                            拒絕
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          <form className="tm-card tm-action-form" onSubmit={addComment}>
            <h2>留言</h2>
            <div className="tm-comment-list">
              {task.comments.length === 0 ? (
                <div className="tm-empty">目前沒有留言。</div>
              ) : (
                task.comments.map((item) => (
                  <div className="task-detail-comment-card" key={item.id}>
                    <div className="task-detail-comment-avatar">
                      {initials(item.author.name)}
                    </div>
                    <div className="task-detail-comment-content-wrapper">
                      <div className="task-detail-comment-author">{item.author.name}</div>
                      <p className="task-detail-comment-text">{item.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <textarea
              className="task-detail-form-textarea"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              required
            />
            <button className="task-detail-btn task-detail-btn-primary" type="submit">
              送出留言
            </button>
          </form>
        </aside>
      </div>
    </section>
  );
}

function RewardCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="tm-reward-card">
      <span className="tm-reward-icon">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function MemberGroup({
  applications,
  availableSlots,
  groupName
}: {
  applications: TaskApplication[];
  availableSlots: number;
  groupName: string;
}) {
  const visibleMembers = applications.slice(0, 4);
  const hiddenCount = Math.max(0, applications.length - visibleMembers.length);

  return (
    <div className="tm-member-group">
      <div className="tm-member-group-title">{groupName}</div>
      <div className="tm-avatar-row">
        {visibleMembers.map((application) => (
          <div className="tm-member-person" key={application.id}>
            <UserAvatar user={application.applicant} />
            <div>
              <strong>{application.applicant.name}</strong>
              <span>{application.applicant.email}</span>
            </div>
          </div>
        ))}
        {hiddenCount > 0 ? <span className="tm-avatar-more">+{hiddenCount}</span> : null}
        {Array.from({ length: Math.min(availableSlots, 2) }).map((_, index) => (
          <span className="tm-available-slot" key={`${groupName}-${index}`}>空位</span>
        ))}
        {applications.length === 0 && availableSlots === 0 ? (
          <span className="tm-available-slot">尚未錄取成員</span>
        ) : null}
      </div>
    </div>
  );
}

function ProgressGroup({
  applications,
  groupName,
  task
}: {
  applications: TaskApplication[];
  groupName: string;
  task: Task;
}) {
  return (
    <div className="tm-progress-group">
      <h3>{groupName}</h3>
      {applications.length === 0 ? (
        <div className="tm-progress-line muted">尚未錄取成員</div>
      ) : (
        applications.map((application) => {
          const status = getMemberStatus(task, application);
          const latest = latestSubmissionFor(task, application.applicant.id);
          return (
            <div className="tm-progress-line" key={application.id}>
              <span className={`tm-status-dot ${status.className}`}>{status.mark}</span>
              <span>{application.applicant.name}</span>
              <em>{latest ? submissionStatusLabels[latest.status] : status.label}</em>
            </div>
          );
        })
      )}
    </div>
  );
}

function UserAvatar({ user }: { user: User }) {
  return (
    <div className="tm-avatar" title={`${user.name} (${user.email})`}>
      {initials(user.name)}
    </div>
  );
}

function getMemberStatus(task: Task, application: TaskApplication): MemberStatus {
  const latestSubmission = latestSubmissionFor(task, application.applicant.id);

  if (latestSubmission?.status === "REJECTED") {
    return {
      className: "task-detail-status-pill-rejected",
      label: "退回修改",
      mark: "!"
    };
  }

  if (latestSubmission?.status === "PENDING") {
    return {
      className: "task-detail-status-pill-pending",
      label: "待驗收",
      mark: "..."
    };
  }

  if (task.status === "DONE") {
    return {
      className: "task-detail-status-pill-accepted",
      label: "已完成",
      mark: "OK"
    };
  }

  if (latestSubmission?.status === "ACCEPTED") {
    return {
      className: "task-detail-status-pill-accepted",
      label: "已驗收，等待結案",
      mark: "OK"
    };
  }

  return {
    className: "task-detail-status-pill-other",
    label: "進行中",
    mark: "..."
  };
}

function submissionHistory(task: Task) {
  const grouped = task.submissions.reduce<Record<string, TaskSubmission[]>>((groups, submission) => {
    const list = groups[submission.employee.id] ?? [];
    list.push(submission);
    groups[submission.employee.id] = list;
    return groups;
  }, {});

  return Object.values(grouped)
    .flatMap((submissions) => {
      const chronological = [...submissions].sort(
        (a, b) => dateValue(a.createdAt) - dateValue(b.createdAt)
      );
      return chronological.map((submission, index) => ({
        employee: submission.employee,
        submission,
        version: `v${index + 1}`
      }));
    })
    .sort((a, b) => dateValue(b.submission.createdAt) - dateValue(a.submission.createdAt));
}

function latestSubmissionFor(task: Task, userId: string) {
  return task.submissions
    .filter((submission) => submission.employee.id === userId)
    .sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt))[0];
}

function calculateOverallProgress(task: Task, applications: TaskApplication[]) {
  if (applications.length === 0) {
    return 0;
  }
  const completed = applications.filter((application) => {
    const latest = latestSubmissionFor(task, application.applicant.id);
    return task.status === "DONE" || latest?.status === "ACCEPTED";
  }).length;
  return Math.round((completed / applications.length) * 100);
}

function canCloseTaskWithRewards(task: Task, applications: TaskApplication[]) {
  if (applications.length === 0 || task.status === "DONE") {
    return false;
  }
  return applications.every((application) =>
    latestSubmissionFor(task, application.applicant.id)?.status === "ACCEPTED"
  );
}

function hasPreviousSubmission(task: Task, user: User | null) {
  if (!user) {
    return false;
  }
  return !!latestSubmissionFor(task, user.id);
}

// Helper to count accepted members for a requirement
function acceptedCountForRequirement(task: Task, requirementId: string) {
  return task.applications.filter(
    (application) =>
      application.requirement?.id === requirementId && application.status === "ACCEPTED"
  ).length;
}

function requirementLabel(task: Task, requirementId: string) {
  const index = task.requirements.findIndex((requirement) => requirement.id === requirementId);
  if (index < 0) {
    return "一般任務";
  }
  return task.requirements[index].name || `需求 ${index + 1}`;
}

function deadlineLabel(value?: string | null) {
  if (!value) {
    return "長期";
  }
  const deadline = new Date(value).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((deadline - today.getTime()) / 86400000);
  if (days < 0) {
    return "已逾期";
  }
  if (days === 0) {
    return "今天截止";
  }
  return `${days} 天後截止`;
}

function submissionPillClass(status: TaskSubmission["status"]) {
  if (status === "ACCEPTED") {
    return "task-detail-status-pill-accepted";
  }
  if (status === "REJECTED") {
    return "task-detail-status-pill-rejected";
  }
  return "task-detail-status-pill-pending";
}

function applicationPillClass(status: TaskApplication["status"]) {
  if (status === "ACCEPTED") {
    return "task-detail-status-pill-accepted";
  }
  if (status === "REJECTED") {
    return "task-detail-status-pill-rejected";
  }
  if (status === "PENDING") {
    return "task-detail-status-pill-pending";
  }
  return "task-detail-status-pill-other";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function dateValue(value?: string) {
  return value ? new Date(value).getTime() : 0;
}
