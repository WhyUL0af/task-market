"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { ProfileTag, User } from "@/lib/types";

type TagForm = {
  name: string;
};

const emptyForm: TagForm = { name: "" };

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
        body: JSON.stringify({ name: form.name, type: "SKILL" })
      });
      setTags((items) => [...items, tag].sort(sortTags));
      setForm(emptyForm);
      setNotice("標籤新增成功。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增標籤失敗");
    }
  }

  function startEdit(tag: ProfileTag) {
    setEditingId(tag.id);
    setEditForm({ name: tag.name });
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
        body: JSON.stringify({ name: editForm.name, type: "SKILL" })
      });
      setTags((items) => items.map((item) => (item.id === tag.id ? tag : item)).sort(sortTags));
      setEditingId(null);
      setEditForm(emptyForm);
      setNotice("標籤更新成功。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新標籤失敗");
    }
  }

  async function deleteTag(tag: ProfileTag) {
    if (!window.confirm(`確定要刪除技能標籤 ${tag.name} 嗎？`)) {
      return;
    }
    setError("");
    setNotice("");
    try {
      await api(`/users/profile-tags/${tag.id}`, { method: "DELETE" });
      setTags((items) => items.filter((item) => item.id !== tag.id));
      setNotice("標籤已成功刪除。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除標籤失敗");
    }
  }

  if (currentUser?.role !== "ADMIN") {
    return (
      <section className="panel" style={{ padding: "40px", textAlign: "center" }}>
        <h1 style={{ fontSize: "28px" }}>標籤管理</h1>
        <p className="error" style={{ display: "inline-block", marginTop: "16px" }}>
          權限不足：只有系統管理員 (Admin) 可以訪問此頁面。
        </p>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <span className="page-kicker">Admin Only</span>
          <h1>標籤管理</h1>
        </div>
      </div>

      <div className="split" style={{ gridTemplateColumns: "1fr 400px" }}>
        {/* Left: Tag List */}
        <section className="panel stack" style={{ gap: "20px" }}>
          <h2>現有技能標籤 ({tags.length})</h2>
          {error ? <p className="error">{error}</p> : null}
          {notice ? <p className="notice">{notice}</p> : null}

          {tags.length === 0 ? (
            <div className="empty">尚未建立技能標籤。</div>
          ) : (
            <div className="list" style={{ gap: "12px" }}>
              {tags.map((tag) => (
                <div
                  className="record"
                  key={tag.id}
                  style={{
                    padding: "12px 20px",
                    background: "rgba(255, 255, 255, 0.015)",
                    border: "1px solid var(--line)"
                  }}
                >
                  {editingId === tag.id ? (
                    <form className="form full" onSubmit={updateTag} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                      <div style={{ flex: 1 }}>
                        <TagFields form={editForm} setForm={setEditForm} />
                      </div>
                      <div className="actions" style={{ marginBottom: "2px" }}>
                        <button className="button" type="submit" style={{ padding: "10px 18px" }}>
                          儲存
                        </button>
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() => setEditingId(null)}
                          style={{ padding: "10px 18px" }}
                        >
                          取消
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: "#000000", fontSize: "15px" }}>{tag.name}</strong>
                      <div className="actions">
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() => startEdit(tag)}
                          style={{ padding: "6px 14px", fontSize: "13px" }}
                        >
                          編輯
                        </button>
                        <button
                          className="button danger"
                          type="button"
                          onClick={() => deleteTag(tag)}
                          style={{ padding: "6px 14px", fontSize: "13px" }}
                        >
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

        {/* Right: Add Tag Form */}
        <aside>
          <form className="panel form full" onSubmit={createTag}>
            <h2>新增技能標籤</h2>
            <TagFields form={form} setForm={setForm} />
            <button className="button" type="submit" style={{ width: "100%", marginTop: "12px" }}>
              新增技能
            </button>
          </form>
        </aside>
      </div>
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
    <label className="field">
      <span className="label">標籤名稱</span>
      <input
        className="input"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
        required
        placeholder="例如: React / Python"
      />
    </label>
  );
}

function sortTags(a: ProfileTag, b: ProfileTag) {
  return a.name.localeCompare(b.name);
}
