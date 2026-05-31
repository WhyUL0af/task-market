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
    <section className="panel">
      <h1>新增任務</h1>
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">標題</span>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="label">描述</span>
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
          <span className="label">狀態</span>
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
        <button className="button" type="submit">
          建立
        </button>
      </form>
    </section>
  );
}
