"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Role, User } from "@/lib/types";

type ManagedUser = User & {
  createdAt?: string;
};

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  password: "",
  role: "EMPLOYEE"
};

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [createForm, setCreateForm] = useState<UserForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UserForm>(emptyForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadUsers() {
    setUsers(await api<ManagedUser[]>("/users"));
  }

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    if (user?.role === "ADMIN") {
      void loadUsers().catch((err) =>
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
        body: JSON.stringify(createForm)
      });
      setUsers((items) => [user, ...items]);
      setCreateForm(emptyForm);
      setMessage("使用者已建立");
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
      role: user.role
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
        ...(editForm.password ? { password: editForm.password } : {})
      };
      const user = await api<ManagedUser>(`/users/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setUsers((items) =>
        items.map((item) => (item.id === user.id ? user : item))
      );
      setEditingId(null);
      setEditForm(emptyForm);
      setMessage("使用者已更新");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新使用者失敗");
    }
  }

  async function deleteUser(user: ManagedUser) {
    const confirmed = window.confirm(
      `確定要刪除 ${user.name} (${user.email}) 嗎？`
    );
    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    try {
      await api(`/users/${user.id}`, { method: "DELETE" });
      setUsers((items) => items.filter((item) => item.id !== user.id));
      setMessage("使用者已刪除");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "刪除使用者失敗，請確認此帳號沒有任務紀錄"
      );
    }
  }

  if (currentUser?.role !== "ADMIN") {
    return (
      <section className="panel">
        <h1>使用者管理</h1>
        <p className="error">只有 Admin 可以管理使用者。</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <div>
        <h1>使用者管理</h1>
        <p className="muted">建立帳號、修改資料、調整角色、重設密碼或刪除帳號。</p>
      </div>

      <form className="panel form" onSubmit={createUser}>
        <h2>新增使用者</h2>
        <UserFields form={createForm} setForm={setCreateForm} requirePassword />
        <button className="button" type="submit">
          建立帳號
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}

      <div className="panel stack">
        <h2>帳號列表</h2>
        {users.map((user) => (
          <div className="card" key={user.id}>
            {editingId === user.id ? (
              <form className="form" onSubmit={updateUser}>
                <UserFields form={editForm} setForm={setEditForm} />
                <div className="actions">
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
                <div className="row">
                  <div>
                    <strong>{user.name}</strong>
                    <p className="muted">{user.email}</p>
                  </div>
                  <span className="badge">{user.role}</span>
                </div>
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
                    type="button"
                    disabled={user.id === currentUser.id}
                    onClick={() => deleteUser(user)}
                  >
                    刪除
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function UserFields({
  form,
  setForm,
  requirePassword = false
}: {
  form: UserForm;
  setForm: (form: UserForm) => void;
  requirePassword?: boolean;
}) {
  return (
    <>
      <label className="field">
        <span className="label">名稱</span>
        <input
          className="input"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
      </label>
      <label className="field">
        <span className="label">Email</span>
        <input
          className="input"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          type="email"
          required
        />
      </label>
      <label className="field">
        <span className="label">
          {requirePassword ? "密碼（至少 8 碼）" : "新密碼（留空則不變）"}
        </span>
        <input
          className="input"
          value={form.password}
          onChange={(event) =>
            setForm({ ...form, password: event.target.value })
          }
          type="password"
          minLength={8}
          required={requirePassword}
        />
      </label>
      <label className="field">
        <span className="label">角色</span>
        <select
          className="select"
          value={form.role}
          onChange={(event) =>
            setForm({ ...form, role: event.target.value as Role })
          }
        >
          <option value="EMPLOYEE">Employee</option>
          <option value="ADMIN">Admin</option>
        </select>
      </label>
    </>
  );
}
