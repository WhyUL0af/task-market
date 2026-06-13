"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { ProfileTag } from "@/lib/types";

type RequirementForm = {
  name: string;
  headcount: string;
  budgetPercent: string;
  xpPercent: string;
  skillTagIds: string[];
};

const emptyRequirement = (): RequirementForm => ({
  name: "",
  headcount: "1",
  budgetPercent: "100",
  xpPercent: "100",
  skillTagIds: []
});

export default function NewTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [xpReward, setXpReward] = useState("250");
  const [status, setStatus] = useState<"DRAFT" | "OPEN">("OPEN");
  const [skillOptions, setSkillOptions] = useState<ProfileTag[]>([]);
  const [requirements, setRequirements] = useState<RequirementForm[]>([emptyRequirement()]);
  const [error, setError] = useState("");

  const budgetTotal = useMemo(
    () => requirements.reduce((total, item) => total + Number(item.budgetPercent || 0), 0),
    [requirements]
  );
  const xpTotal = useMemo(
    () => requirements.reduce((total, item) => total + Number(item.xpPercent || 0), 0),
    [requirements]
  );

  useEffect(() => {
    api<ProfileTag[]>("/users/profile-tags")
      .then((tags) => setSkillOptions(tags.filter((tag) => tag.type === "SKILL")))
      .catch((err) => setError(err instanceof Error ? err.message : "讀取技能失敗"));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (budgetTotal !== 100) {
      setError("預算比例總和必須等於 100%。");
      return;
    }
    if (xpTotal !== 100) {
      setError("EXP 比例總和必須等於 100%。");
      return;
    }

    try {
      await api("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          reward: reward ? Number(reward) : undefined,
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          difficulty,
          xpReward: Number(xpReward),
          status,
          requirements: requirements.map((item) => ({
            name: item.name || undefined,
            headcount: Number(item.headcount),
            budgetPercent: Number(item.budgetPercent),
            xpPercent: Number(item.xpPercent),
            skillTagIds: item.skillTagIds
          }))
        })
      });
      router.push("/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立任務失敗");
    }
  }

  function updateRequirement(index: number, patch: Partial<RequirementForm>) {
    setRequirements((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    );
  }

  function removeRequirement(index: number) {
    setRequirements((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <span className="page-kicker">New Quest</span>
          <h1>建立任務</h1>
        </div>
      </div>

      <form className="split" onSubmit={onSubmit} style={{ alignItems: "stretch" }}>
        <div className="stack" style={{ gap: "24px" }}>
          <div className="panel stack" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
              任務資料
            </h2>

            <label className="field">
              <span className="label">任務名稱</span>
              <input
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="label">任務說明</span>
              <textarea
                className="textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                style={{ minHeight: "180px" }}
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
          </div>

          <div className="panel stack" style={{ padding: "24px" }}>
            <div className="tm-section-head tm-section-head-inline">
              <h2>招募需求</h2>
              <button
                className="button secondary"
                type="button"
                onClick={() => setRequirements((items) => [...items, emptyRequirement()])}
              >
                新增需求
              </button>
            </div>

            <div className="tm-note">
              預算 {budgetTotal}% / 100%　EXP {xpTotal}% / 100%
            </div>

            {requirements.map((requirement, index) => (
              <div className="panel stack" key={index} style={{ padding: "18px" }}>
                <div className="tm-section-head tm-section-head-inline">
                  <h3 style={{ fontSize: "16px" }}>需求 {index + 1}</h3>
                  {requirements.length > 1 ? (
                    <button
                      className="button danger"
                      type="button"
                      onClick={() => removeRequirement(index)}
                    >
                      刪除
                    </button>
                  ) : null}
                </div>

                <label className="field">
                  <span className="label">需求名稱</span>
                  <input
                    className="input"
                    value={requirement.name}
                    onChange={(event) => updateRequirement(index, { name: event.target.value })}
                  />
                </label>

                <div className="form-grid-3">
                  <label className="field">
                    <span className="label">人數</span>
                    <input
                      className="input"
                      value={requirement.headcount}
                      onChange={(event) =>
                        updateRequirement(index, { headcount: event.target.value })
                      }
                      type="number"
                      min={1}
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="label">預算比例 %</span>
                    <input
                      className="input"
                      value={requirement.budgetPercent}
                      onChange={(event) =>
                        updateRequirement(index, { budgetPercent: event.target.value })
                      }
                      type="number"
                      min={0}
                      max={100}
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="label">EXP 比例 %</span>
                    <input
                      className="input"
                      value={requirement.xpPercent}
                      onChange={(event) =>
                        updateRequirement(index, { xpPercent: event.target.value })
                      }
                      type="number"
                      min={0}
                      max={100}
                      required
                    />
                  </label>
                </div>

                <div className="field">
                  <span className="label">需要技能</span>
                  <div className="badge-strip">
                    {skillOptions.map((skill) => {
                      const selected = requirement.skillTagIds.includes(skill.id);
                      return (
                        <button
                          className={`tag-chip ${selected ? "selected" : ""}`}
                          key={skill.id}
                          type="button"
                          onClick={() =>
                            updateRequirement(index, {
                              skillTagIds: toggleId(requirement.skillTagIds, skill.id)
                            })
                          }
                        >
                          {skill.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="stack" style={{ gap: "24px" }}>
          <div className="panel stack" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
              任務設定
            </h2>

            <label className="field">
              <span className="label">難度</span>
              <select
                className="select"
                value={difficulty}
                onChange={(event) => {
                  const next = event.target.value as "EASY" | "MEDIUM" | "HARD";
                  setDifficulty(next);
                  setXpReward(next === "EASY" ? "100" : next === "MEDIUM" ? "250" : "500");
                }}
              >
                <option value="EASY">Easy / 100 EXP</option>
                <option value="MEDIUM">Medium / 250 EXP</option>
                <option value="HARD">Hard / 500 EXP</option>
              </select>
            </label>

            <label className="field">
              <span className="label">EXP 獎勵</span>
              <input
                className="input"
                value={xpReward}
                onChange={(event) => setXpReward(event.target.value)}
                type="number"
                min={0}
                required
              />
            </label>

            <label className="field">
              <span className="label">截止時間</span>
              <input
                className="input"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                type="datetime-local"
              />
            </label>

            <label className="field">
              <span className="label">發布狀態</span>
              <select
                className="select"
                value={status}
                onChange={(event) => setStatus(event.target.value as "DRAFT" | "OPEN")}
              >
                <option value="OPEN">Open</option>
                <option value="DRAFT">Draft</option>
              </select>
            </label>
          </div>

          <div className="panel stack" style={{ padding: "24px" }}>
            {error ? <p className="error">{error}</p> : null}
            <div className="actions" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button className="button" type="submit" style={{ width: "100%" }}>
                建立任務
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={() => router.push("/tasks")}
                style={{ width: "100%" }}
              >
                取消
              </button>
            </div>
          </div>
        </aside>
      </form>
    </section>
  );
}

function toggleId(values: string[], id: string) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}
