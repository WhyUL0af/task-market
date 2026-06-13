"use client";

import { FormEvent, useEffect, useState } from "react";
import { RankBadge } from "@/components/rank-badge";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { ProfileTag, Role, User } from "@/lib/types";

type ManagedUser = User & {
  createdAt?: string;
};

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: Role;
  xp: string;
  level: string;
  skillTagIds: string[];
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  password: "",
  role: "EMPLOYEE",
  xp: "0",
  level: "1",
  skillTagIds: []
};

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [skillTags, setSkillTags] = useState<ProfileTag[]>([]);
  const [createForm, setCreateForm] = useState<UserForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UserForm>(emptyForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadUsers() {
    setUsers(await api<ManagedUser[]>("/users"));
  }

  async function loadSkillTags() {
    const tags = await api<ProfileTag[]>("/users/profile-tags");
    setSkillTags(tags.filter((tag) => tag.type === "SKILL"));
  }

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    if (user?.role === "ADMIN") {
      void Promise.all([loadUsers(), loadSkillTags()]).catch((err) =>
        setError(err instanceof Error ? err.message : "讀取使用者失敗")
      );
    }
  }, []);

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const user = await api<ManagedUser>("/users", {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          role: createForm.role
        })
      });
      setUsers((items) => [user, ...items]);
      setCreateForm(emptyForm);
      setMessage("使用者已建立。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立使用者失敗");
    }
  }

  function startEdit(user: ManagedUser) {
    setEditingId(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      xp: String(user.xp ?? 0),
      level: String(user.level ?? 1),
      skillTagIds: (user.skillTags ?? []).map((tag) => tag.id)
    });
    setError("");
    setMessage("");
  }

  async function updateUser(event: FormEvent) {
    event.preventDefault();
    if (!editingId) {
      return;
    }
    setError("");
    setMessage("");
    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        xp: Number(editForm.xp),
        level: Number(editForm.level),
        skillTagIds: editForm.skillTagIds,
        ...(editForm.password ? { password: editForm.password } : {})
      };
      const user = await api<ManagedUser>(`/users/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setUsers((items) => items.map((item) => (item.id === user.id ? user : item)));
      setEditingId(null);
      setEditForm(emptyForm);
      setMessage("使用者資料已更新。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新使用者失敗");
    }
  }

  async function deleteUser(user: ManagedUser) {
    if (!window.confirm(`確定要刪除 ${user.name}？`)) {
      return;
    }
    setError("");
    setMessage("");
    try {
      await api(`/users/${user.id}`, { method: "DELETE" });
      setUsers((items) => items.filter((item) => item.id !== user.id));
      setMessage("使用者已刪除。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除使用者失敗");
    }
  }

  if (currentUser?.role !== "ADMIN") {
    return (
      <section className="panel" style={{ padding: "40px", textAlign: "center" }}>
        <h1 style={{ fontSize: "28px" }}>使用者管理</h1>
        <p className="error" style={{ display: "inline-block", marginTop: "16px" }}>
          只有管理者可以進入這個頁面。
        </p>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <span className="page-kicker">Admin Only</span>
          <h1>使用者管理</h1>
        </div>
      </div>

      <div className="split" style={{ gridTemplateColumns: "1fr 420px" }}>
        <section className="panel stack" style={{ gap: "20px" }}>
          <h2>帳號列表 ({users.length})</h2>
          {error ? <p className="error">{error}</p> : null}
          {message ? <p className="notice">{message}</p> : null}

          {users.length === 0 ? (
            <div className="empty">目前沒有使用者。</div>
          ) : (
            <div className="list" style={{ gap: "16px" }}>
              {users.map((user) => (
                <div
                  className="card"
                  key={user.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.015)",
                    border: "1px solid var(--line)"
                  }}
                >
                  {editingId === user.id ? (
                    <form className="form full" onSubmit={updateUser} style={{ gap: "16px" }}>
                      <h3>編輯 {user.name}</h3>
                      <UserFields
                        form={editForm}
                        setForm={setEditForm}
                        showAdminFields
                        skillTags={skillTags}
                      />
                      <div className="actions" style={{ marginTop: "12px" }}>
                        <button className="button" type="submit">
                          儲存
                        </button>
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() => setEditingId(null)}
                        >
                          取消
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div
                        className="row"
                        style={{
                          alignItems: "flex-start",
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "12px"
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: "16px" }}>{user.name}</strong>
                          <p className="muted" style={{ margin: "2px 0 0", fontSize: "13px" }}>
                            {user.email}
                          </p>
                        </div>
                        <span
                          className="badge"
                          style={{
                            borderColor:
                              user.role === "ADMIN"
                                ? "rgba(217, 119, 6, 0.25)"
                                : "rgba(2, 132, 199, 0.25)",
                            color: user.role === "ADMIN" ? "#b45309" : "var(--primary)"
                          }}
                        >
                          {user.role}
                        </span>
                      </div>

                      <div className="stat-grid" style={{ marginBottom: "16px" }}>
                        <div className="stat" style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: "10px" }}>稱號</span>
                          <div style={{ marginTop: "4px" }}>
                            <RankBadge
                              level={user.level ?? 1}
                              style={{ fontSize: "13px", padding: "4px 8px" }}
                            />
                          </div>
                        </div>
                        <div className="stat" style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: "10px" }}>EXP</span>
                          <strong style={{ fontSize: "15px" }}>{user.xp ?? 0}</strong>
                        </div>
                      </div>

                      {user.skillTags?.length ? (
                        <div className="badge-strip" style={{ marginBottom: "16px" }}>
                          {user.skillTags.map((tag) => (
                            <span
                              className="badge"
                              key={tag.id}
                              style={{
                                borderColor: "rgba(255, 255, 255, 0.05)",
                                fontSize: "11px"
                              }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="actions">
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() => startEdit(user)}
                        >
                          編輯
                        </button>
                        <button
                          className="button danger"
                          disabled={user.id === currentUser?.id}
                          onClick={() => deleteUser(user)}
                          type="button"
                        >
                          刪除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <aside>
          <form className="panel form full" onSubmit={createUser}>
            <h2>建立帳號</h2>
            <UserFields form={createForm} setForm={setCreateForm} requirePassword />
            <button className="button" style={{ marginTop: "12px", width: "100%" }} type="submit">
              建立使用者
            </button>
          </form>
        </aside>
      </div>
    </section>
  );
}

function UserFields({
  form,
  setForm,
  requirePassword = false,
  showAdminFields = false,
  skillTags = []
}: {
  form: UserForm;
  setForm: (form: UserForm) => void;
  requirePassword?: boolean;
  showAdminFields?: boolean;
  skillTags?: ProfileTag[];
}) {
  return (
    <>
      <label className="field">
        <span className="label">姓名</span>
        <input
          className="input"
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="例如：王小明"
          required
          value={form.name}
        />
      </label>
      <label className="field">
        <span className="label">帳號 Email</span>
        <input
          className="input"
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder="user@example.com"
          required
          type="email"
          value={form.email}
        />
      </label>
      <label className="field">
        <span className="label">{requirePassword ? "密碼" : "密碼（留空則不變更）"}</span>
        <input
          className="input"
          minLength={8}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          placeholder="至少 8 個字元"
          required={requirePassword}
          type="password"
          value={form.password}
        />
      </label>
      <label className="field">
        <span className="label">系統角色</span>
        <select
          className="select"
          onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
          value={form.role}
        >
          <option value="EMPLOYEE">Employee</option>
          <option value="ADMIN">Admin</option>
        </select>
      </label>
      {showAdminFields ? (
        <>
          <label className="field">
            <span className="label">EXP</span>
            <input
              className="input"
              min={0}
              onChange={(event) => setForm({ ...form, xp: event.target.value })}
              type="number"
              value={form.xp}
            />
          </label>
          <label className="field">
            <span className="label">稱號等級</span>
            <input
              className="input"
              max={8}
              min={1}
              onChange={(event) => setForm({ ...form, level: event.target.value })}
              type="number"
              value={form.level}
            />
            <span
              style={{
                alignItems: "center",
                color: "var(--primary)",
                display: "inline-flex",
                fontSize: "12px",
                gap: "6px"
              }}
            >
              <span>目前稱號：</span>
              <RankBadge
                level={Number(form.level) || 1}
                style={{ fontSize: "11px", padding: "2px 6px" }}
              />
            </span>
          </label>
          <div className="field">
            <span className="label">技能標籤</span>
            <div className="badge-strip" style={{ marginTop: "6px" }}>
              {skillTags.map((tag) => {
                const selected = form.skillTagIds.includes(tag.id);
                return (
                  <button
                    className={`tag-chip ${selected ? "selected" : ""}`}
                    key={tag.id}
                    onClick={() =>
                      setForm({
                        ...form,
                        skillTagIds: toggleId(form.skillTagIds, tag.id)
                      })
                    }
                    type="button"
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

function toggleId(values: string[], id: string) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}
