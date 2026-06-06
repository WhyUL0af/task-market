"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { ProfileTag } from "@/lib/types";

type RoleRequirementForm = {
  roleTagId: string;
  headcount: string;
  skillTagIds: string[];
  budgetPercent: string;
  xpPercent: string;
};

export default function NewTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [xpReward, setXpReward] = useState("250");
  const [status, setStatus] = useState<"DRAFT" | "OPEN">("OPEN");
  const [roleOptions, setRoleOptions] = useState<ProfileTag[]>([]);
  const [skillOptions, setSkillOptions] = useState<ProfileTag[]>([]);
  const [roleRequirements, setRoleRequirements] = useState<RoleRequirementForm[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<ProfileTag[]>("/users/profile-tags")
      .then((tags) => {
        setRoleOptions(tags.filter((tag) => tag.type === "ROLE"));
        setSkillOptions(tags.filter((tag) => tag.type === "SKILL"));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "讀取標籤失敗"));
  }, []);

  const budgetTotal = useMemo(
    () =>
      roleRequirements.reduce(
        (sum, item) => sum + (item.budgetPercent ? Number(item.budgetPercent) : 0),
        0
      ),
    [roleRequirements]
  );
  const xpTotal = useMemo(
    () =>
      roleRequirements.reduce(
        (sum, item) => sum + (item.xpPercent ? Number(item.xpPercent) : 0),
        0
      ),
    [roleRequirements]
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (roleRequirements.length > 0 && budgetTotal !== 100) {
      setError("職位預算比例總和必須等於 100%");
      return;
    }
    if (roleRequirements.length > 0 && xpTotal !== 100) {
      setError("職位 XP 比例總和必須等於 100%");
      return;
    }

    try {
      await api("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          reward: reward ? Number(reward) : undefined,
          difficulty,
          xpReward: Number(xpReward),
          status,
          roleRequirements: roleRequirements
            .filter((item) => item.roleTagId)
            .map((item) => ({
              roleTagId: item.roleTagId,
              headcount: Number(item.headcount || 1),
              skillTagIds: item.skillTagIds,
              budgetPercent: Number(item.budgetPercent || 0),
              xpPercent: Number(item.xpPercent || 0)
            }))
        })
      });
      router.push("/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立任務失敗");
    }
  }

  function addRoleRequirement() {
    setRoleRequirements((items) => [
      ...items,
      {
        roleTagId: firstUnusedRoleId(items, roleOptions),
        headcount: "1",
        skillTagIds: [],
        budgetPercent: "0",
        xpPercent: "0"
      }
    ]);
  }

  function updateRoleRequirement(index: number, next: RoleRequirementForm) {
    setRoleRequirements((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? next : item))
    );
  }

  function removeRoleRequirement(index: number) {
    setRoleRequirements((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <p className="page-kicker">Admin</p>
          <h1>新增任務</h1>
          <p className="muted">建立任務內容，並設定需要招募的職位與預算比例。</p>
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
          <span className="label">總預算</span>
          <input
            className="input"
            value={reward}
            onChange={(event) => setReward(event.target.value)}
            type="number"
            min={0}
          />
        </label>

        <section className="stack">
          <div className="row">
            <div>
              <h2>職位招募</h2>
              <p className="muted">每個職位只能加入一次，預算與 XP 比例總和都必須是 100%。</p>
            </div>
            <button className="button secondary" type="button" onClick={addRoleRequirement}>
              新增職位
            </button>
          </div>
          {roleRequirements.length === 0 ? (
            <div className="empty">尚未設定職位，任務會以一般任務發布。</div>
          ) : (
            <div className="list">
              {roleRequirements.map((item, index) => (
                <div className="record" key={`${item.roleTagId}-${index}`}>
                  <div className="role-grid">
                    <label className="field">
                      <span className="label">招募職位</span>
                      <select
                        className="select"
                        value={item.roleTagId}
                        onChange={(event) =>
                          updateRoleRequirement(index, {
                            ...item,
                            roleTagId: event.target.value
                          })
                        }
                        required
                      >
                        <option value="">選擇職位</option>
                        {roleOptions.map((role) => (
                          <option
                            disabled={roleRequirements.some(
                              (existing, existingIndex) =>
                                existingIndex !== index && existing.roleTagId === role.id
                            )}
                            key={role.id}
                            value={role.id}
                          >
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="label">需求人數</span>
                      <input
                        className="input"
                        value={item.headcount}
                        onChange={(event) =>
                          updateRoleRequirement(index, {
                            ...item,
                            headcount: event.target.value
                          })
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
                        value={item.budgetPercent}
                        onChange={(event) =>
                          updateRoleRequirement(index, {
                            ...item,
                            budgetPercent: event.target.value
                          })
                        }
                        type="number"
                        min={0}
                        max={100}
                        required
                      />
                    </label>
                    <label className="field">
                      <span className="label">XP 比例 %</span>
                      <input
                        className="input"
                        value={item.xpPercent}
                        onChange={(event) =>
                          updateRoleRequirement(index, {
                            ...item,
                            xpPercent: event.target.value
                          })
                        }
                        type="number"
                        min={0}
                        max={100}
                        required
                      />
                    </label>
                    <button
                      className="button danger"
                      type="button"
                      onClick={() => removeRoleRequirement(index)}
                    >
                      刪除
                    </button>
                  </div>
                  <div className="field" style={{ marginTop: 12 }}>
                    <span className="label">技能需求</span>
                    <div className="badge-strip">
                      {skillOptions.map((skill) => {
                        const selected = item.skillTagIds.includes(skill.id);
                        return (
                          <button
                            className={`tag-chip ${selected ? "selected" : ""}`}
                            key={skill.id}
                            type="button"
                            onClick={() =>
                              updateRoleRequirement(index, {
                                ...item,
                                skillTagIds: toggleId(item.skillTagIds, skill.id)
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
          )}
          <p className={budgetTotal !== 100 && roleRequirements.length > 0 ? "error" : "notice"}>
            目前職位預算比例總和：{budgetTotal}%
          </p>
          <p className={xpTotal !== 100 && roleRequirements.length > 0 ? "error" : "notice"}>
            目前職位 XP 比例總和：{xpTotal}%
          </p>
        </section>

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
            <option value="EASY">Easy / 100 XP</option>
            <option value="MEDIUM">Medium / 250 XP</option>
            <option value="HARD">Hard / 500 XP</option>
          </select>
        </label>
        <label className="field">
          <span className="label">XP 獎勵</span>
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

function firstUnusedRoleId(items: RoleRequirementForm[], options: ProfileTag[]) {
  return options.find((option) => !items.some((item) => item.roleTagId === option.id))?.id ?? "";
}

function toggleId(values: string[], id: string) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}
