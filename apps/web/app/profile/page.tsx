"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import type {
  GamificationProfile,
  NotificationSettings,
  Profile,
  ProfileTag
} from "@/lib/types";

const defaultNotifications: NotificationSettings = {
  email: true,
  taskUpdates: true,
  reviewResults: true
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gameProfile, setGameProfile] = useState<GamificationProfile | null>(null);
  const [tagOptions, setTagOptions] = useState<ProfileTag[]>([]);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [skillTagIds, setSkillTagIds] = useState<string[]>([]);
  const [preferredRoleIds, setPreferredRoleIds] = useState<string[]>([]);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(defaultNotifications);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([api<Profile>("/users/me"), api<ProfileTag[]>("/users/profile-tags")])
      .then(async ([profileResult, tags]) => {
        const gameResult = await api<GamificationProfile>(
          `/gamification/profile/${profileResult.id}`
        );
        setProfile(profileResult);
        setGameProfile(gameResult);
        setTagOptions(tags);
        setName(profileResult.name);
        setBio(profileResult.bio ?? "");
        setSkillTagIds((profileResult.skillTags ?? []).map((tag) => tag.id));
        setPreferredRoleIds((profileResult.preferredRoles ?? []).map((tag) => tag.id));
        setNotificationSettings({
          ...defaultNotifications,
          ...(profileResult.notificationSettings ?? {})
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "讀取個人資料失敗"));
  }, []);

  const skillOptions = tagOptions.filter((tag) => tag.type === "SKILL");
  const roleOptions = tagOptions.filter((tag) => tag.type === "ROLE");

  const nextLevelXp = gameProfile?.nextLevelExp ?? 300;

  const currentLevelXp = useMemo(() => {
    const level = gameProfile?.level ?? profile?.level ?? 1;
    const thresholds = [0, 300, 700, 1200, 1800];
    return thresholds[level - 1] ?? Math.max(0, nextLevelXp - 700);
  }, [gameProfile, nextLevelXp, profile]);

  const levelProgress = useMemo(() => {
    const xp = gameProfile?.exp ?? profile?.xp ?? 0;
    const span = Math.max(1, nextLevelXp - currentLevelXp);
    return Math.min(100, Math.max(0, ((xp - currentLevelXp) / span) * 100));
  }, [currentLevelXp, gameProfile, nextLevelXp, profile]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      const updated = await api<Profile>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          bio,
          skillTagIds,
          preferredRoleIds,
          notificationSettings
        })
      });
      setProfile(updated);
      setSkillTagIds((updated.skillTags ?? []).map((tag) => tag.id));
      setPreferredRoleIds((updated.preferredRoles ?? []).map((tag) => tag.id));
      saveSession(updated);
      setNotice("個人設定已更新");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新個人設定失敗");
    }
  }

  function toggleNotification(key: keyof NotificationSettings) {
    setNotificationSettings((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  if (!profile) {
    return <p className={error ? "error" : "notice"}>{error || "讀取個人資料中..."}</p>;
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <p className="page-kicker">Profile</p>
          <h1>個人設定</h1>
          <p className="muted">管理你的基本資料、技能偏好與任務表現。</p>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}

      <div className="split">
        <form className="panel form full" onSubmit={submit}>
          <section className="stack">
            <div>
              <h2>基本資料</h2>
              <p className="muted">{profile.email}</p>
            </div>

            <label className="field">
              <span className="label">名稱</span>
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="label">自我介紹</span>
              <textarea
                className="textarea"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="簡短描述你的專長、可協助的任務或目前目標"
              />
            </label>
          </section>

          <section className="stack">
            <h2>技能與偏好</h2>
            <TagSelector
              emptyText="尚未有技能標籤，請 Admin 先建立。"
              label="技能標籤"
              options={skillOptions}
              selectedIds={skillTagIds}
              onToggle={(id) => setSkillTagIds(toggleId(skillTagIds, id))}
            />
            <TagSelector
              emptyText="尚未有偏好職位，請 Admin 先建立。"
              label="偏好職位"
              options={roleOptions}
              selectedIds={preferredRoleIds}
              onToggle={(id) => setPreferredRoleIds(toggleId(preferredRoleIds, id))}
            />
          </section>

          <section className="stack">
            <h2>通知設定</h2>
            <div className="toggle-grid">
              <label className="toggle-row">
                <input
                  checked={notificationSettings.email}
                  type="checkbox"
                  onChange={() => toggleNotification("email")}
                />
                <span>Email 通知</span>
              </label>
              <label className="toggle-row">
                <input
                  checked={notificationSettings.taskUpdates}
                  type="checkbox"
                  onChange={() => toggleNotification("taskUpdates")}
                />
                <span>任務更新</span>
              </label>
              <label className="toggle-row">
                <input
                  checked={notificationSettings.reviewResults}
                  type="checkbox"
                  onChange={() => toggleNotification("reviewResults")}
                />
                <span>審核結果</span>
              </label>
            </div>
          </section>

          <div className="actions">
            <button className="button" type="submit">
              儲存設定
            </button>
          </div>
        </form>

        <aside className="stack">
          <section className="panel stack">
            <div className="row">
              <div>
                <p className="page-kicker">Level</p>
                <h2>Lv.{gameProfile?.level ?? profile.level ?? 1}</h2>
              </div>
              <span className="xp-badge">{gameProfile?.exp ?? profile.xp ?? 0} EXP</span>
            </div>
            <div className="progress">
              <span style={{ width: `${levelProgress}%` }} />
            </div>
            <p className="subtle">
              距離下一級：{Math.max(0, nextLevelXp - (gameProfile?.exp ?? profile.xp ?? 0))} EXP
            </p>
            {gameProfile?.activeTitle ? (
              <span className="badge">{gameProfile.activeTitle.name}</span>
            ) : null}
          </section>

          <section className="panel stack">
            <h2>任務統計</h2>
            <div className="stat-grid">
              <div className="stat highlight-card">
                <span className="subtle">完成率</span>
                <strong>{profile.stats.completionRate}%</strong>
              </div>
              <div className="stat">
                <span className="subtle">已完成</span>
                <strong>{profile.stats.completedCount}</strong>
              </div>
              <div className="stat">
                <span className="subtle">進行中</span>
                <strong>{profile.stats.inProgressCount}</strong>
              </div>
              <div className="stat">
                <span className="subtle">待驗收</span>
                <strong>{profile.stats.reviewCount}</strong>
              </div>
              <div className="stat">
                <span className="subtle">申請次數</span>
                <strong>{profile.stats.applicationCount}</strong>
              </div>
              <div className="stat">
                <span className="subtle">提交次數</span>
                <strong>{profile.stats.submissionCount}</strong>
              </div>
            </div>
          </section>

          <section className="panel stack">
            <h2>成就徽章</h2>
            <div className="badge-strip">
              {gameProfile?.badges.length ? (
                gameProfile.badges.map((item) => (
                  <span className="badge" key={item.badge.id}>
                    {item.badge.icon} {item.badge.name}
                  </span>
                ))
              ) : (
                <span className="muted">尚未解鎖徽章</span>
              )}
            </div>
            <h2>稱號</h2>
            <div className="badge-strip">
              {gameProfile?.titles.length ? (
                gameProfile.titles.map((item) => (
                  <span className="badge" key={item.title.id}>
                    {item.title.name}
                  </span>
                ))
              ) : (
                <span className="muted">尚未獲得稱號</span>
              )}
            </div>
          </section>

          <section className="panel stack">
            <h2>最近 EXP</h2>
            {gameProfile?.recentExp.length ? (
              <div className="list">
                {gameProfile.recentExp.map((item) => (
                  <div className="record" key={item.id}>
                    <div className="row">
                      <span>{item.reason}</span>
                      <strong>+{item.amount}</strong>
                    </div>
                    {item.roleName ? <p className="muted">{item.roleName}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">尚未取得 EXP</p>
            )}
          </section>

          <section className="panel stack">
            <h2>技能標籤</h2>
            <TagStrip values={profile.skillTags ?? []} emptyText="尚未設定技能" />
            <h2>偏好職位</h2>
            <TagStrip values={profile.preferredRoles ?? []} emptyText="尚未設定偏好職位" />
          </section>
        </aside>
      </div>
    </section>
  );
}

function toggleId(values: string[], id: string) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

function TagStrip({ values, emptyText }: { values: ProfileTag[]; emptyText: string }) {
  if (values.length === 0) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <div className="badge-strip">
      {values.map((value) => (
        <span className="badge" key={value.id}>
          {value.name}
        </span>
      ))}
    </div>
  );
}

function TagSelector({
  label,
  options,
  selectedIds,
  emptyText,
  onToggle
}: {
  label: string;
  options: ProfileTag[];
  selectedIds: string[];
  emptyText: string;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      {options.length === 0 ? <p className="muted">{emptyText}</p> : null}
      <div className="badge-strip">
        {options.map((tag) => {
          const selected = selectedIds.includes(tag.id);
          return (
            <button
              className={`tag-chip ${selected ? "selected" : ""}`}
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
