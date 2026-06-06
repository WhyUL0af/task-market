"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { ProfileTag, ProfileTagType, User } from "@/lib/types";

type TagForm = {
  name: string;
  type: ProfileTagType;
};

const emptyForm: TagForm = {
  name: "",
  type: "SKILL"
};

export default function ProfileTagsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tags, setTags] = useState<ProfileTag[]>([]);
  const [form, setForm] = useState<TagForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TagForm>(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadTags() {
    setTags(await api<ProfileTag[]>("/users/profile-tags"));
  }

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    if (user?.role === "ADMIN") {
      void loadTags().catch((err) =>
        setError(err instanceof Error ? err.message : "讀取標籤失敗")
      );
    }
  }, []);

  async function createTag(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const tag = await api<ProfileTag>("/users/profile-tags", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setTags((items) => [...items, tag].sort(sortTags));
      setForm(emptyForm);
      setNotice("標籤已新增");
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增標籤失敗");
    }
  }

  function startEdit(tag: ProfileTag) {
    setEditingId(tag.id);
    setEditForm({ name: tag.name, type: tag.type });
    setError("");
    setNotice("");
  }

  async function updateTag(event: FormEvent) {
    event.preventDefault();
    if (!editingId) {
      return;
    }
    setError("");
    setNotice("");
    try {
      const tag = await api<ProfileTag>(`/users/profile-tags/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(editForm)
      });
      setTags((items) => items.map((item) => (item.id === tag.id ? tag : item)).sort(sortTags));
      setEditingId(null);
      setEditForm(emptyForm);
      setNotice("標籤已更新");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新標籤失敗");
    }
  }

  async function deleteTag(tag: ProfileTag) {
    if (!window.confirm(`確定刪除「${tag.name}」嗎？`)) {
      return;
    }
    setError("");
    setNotice("");
    try {
      await api(`/users/profile-tags/${tag.id}`, { method: "DELETE" });
      setTags((items) => items.filter((item) => item.id !== tag.id));
      setNotice("標籤已刪除");
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除標籤失敗");
    }
  }

  if (currentUser?.role !== "ADMIN") {
    return (
      <section className="panel">
        <h1>標籤管理</h1>
        <p className="error">只有 Admin 可以管理標籤。</p>
      </section>
    );
  }

  const skillTags = tags.filter((tag) => tag.type === "SKILL");
  const roleTags = tags.filter((tag) => tag.type === "ROLE");

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <p className="page-kicker">Admin</p>
          <h1>標籤管理</h1>
          <p className="muted">統一管理技能標籤與偏好職位，讓資料保持乾淨。</p>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}

      <div className="split">
        <form className="panel form full" onSubmit={createTag}>
          <h2>新增標籤</h2>
          <TagFields form={form} setForm={setForm} />
          <button className="button" type="submit">
            新增標籤
          </button>
        </form>

        <aside className="panel">
          <h2>使用方式</h2>
          <p className="muted">
            Employee 在個人設定只能選擇這裡建立的標籤，不能自行新增同義詞。
          </p>
          <p className="muted">已被使用的標籤不能刪除，但可以改名。</p>
        </aside>
      </div>

      <TagSection
        editingId={editingId}
        editForm={editForm}
        emptyText="尚未建立技能標籤"
        onCancel={() => setEditingId(null)}
        onDelete={deleteTag}
        onEdit={startEdit}
        onSubmit={updateTag}
        setEditForm={setEditForm}
        tags={skillTags}
        title="技能標籤"
      />

      <TagSection
        editingId={editingId}
        editForm={editForm}
        emptyText="尚未建立偏好職位"
        onCancel={() => setEditingId(null)}
        onDelete={deleteTag}
        onEdit={startEdit}
        onSubmit={updateTag}
        setEditForm={setEditForm}
        tags={roleTags}
        title="偏好職位"
      />
    </section>
  );
}

function TagSection({
  title,
  tags,
  emptyText,
  editingId,
  editForm,
  setEditForm,
  onEdit,
  onDelete,
  onSubmit,
  onCancel
}: {
  title: string;
  tags: ProfileTag[];
  emptyText: string;
  editingId: string | null;
  editForm: TagForm;
  setEditForm: (form: TagForm) => void;
  onEdit: (tag: ProfileTag) => void;
  onDelete: (tag: ProfileTag) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <section className="panel stack">
      <h2>{title}</h2>
      {tags.length === 0 ? (
        <div className="empty">{emptyText}</div>
      ) : (
        <div className="list">
          {tags.map((tag) => (
            <div className="record" key={tag.id}>
              {editingId === tag.id ? (
                <form className="form full" onSubmit={onSubmit}>
                  <TagFields form={editForm} setForm={setEditForm} />
                  <div className="actions">
                    <button className="button" type="submit">
                      儲存
                    </button>
                    <button className="button secondary" type="button" onClick={onCancel}>
                      取消
                    </button>
                  </div>
                </form>
              ) : (
                <div className="row">
                  <div>
                    <strong>{tag.name}</strong>
                    <p className="muted">{tag.type === "SKILL" ? "技能標籤" : "偏好職位"}</p>
                  </div>
                  <div className="actions">
                    <button className="button secondary" type="button" onClick={() => onEdit(tag)}>
                      編輯
                    </button>
                    <button className="button danger" type="button" onClick={() => onDelete(tag)}>
                      刪除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TagFields({
  form,
  setForm
}: {
  form: TagForm;
  setForm: (form: TagForm) => void;
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
        <span className="label">類型</span>
        <select
          className="select"
          value={form.type}
          onChange={(event) => setForm({ ...form, type: event.target.value as ProfileTagType })}
        >
          <option value="SKILL">技能標籤</option>
          <option value="ROLE">偏好職位</option>
        </select>
      </label>
    </>
  );
}

function sortTags(a: ProfileTag, b: ProfileTag) {
  return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
}
