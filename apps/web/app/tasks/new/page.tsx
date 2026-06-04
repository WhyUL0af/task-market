"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";

export default function NewTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "OPEN">("OPEN");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          reward: reward ? Number(reward) : undefined,
          status
        })
      });
      router.push("/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立任務失敗");
    }
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <p className="page-kicker">Admin</p>
          <h1>新增任務</h1>
          <p className="muted">建立任務草稿或直接開放員工申請。</p>
        </div>
      </div>

      <form className="panel form" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">任務標題</span>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="label">任務描述</span>
          <textarea
            className="textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="label">預算</span>
          <input
            className="input"
            value={reward}
            onChange={(event) => setReward(event.target.value)}
            type="number"
            min={0}
          />
        </label>
        <label className="field">
          <span className="label">發布狀態</span>
          <select
            className="select"
            value={status}
            onChange={(event) => setStatus(event.target.value as "DRAFT" | "OPEN")}
          >
            <option value="OPEN">OPEN</option>
            <option value="DRAFT">DRAFT</option>
          </select>
        </label>
        {error ? <p className="error">{error}</p> : null}
        <div className="actions">
          <button className="button" type="submit">
            建立任務
          </button>
          <button className="button secondary" type="button" onClick={() => router.push("/tasks")}>
            取消
          </button>
        </div>
      </form>
    </section>
  );
}
