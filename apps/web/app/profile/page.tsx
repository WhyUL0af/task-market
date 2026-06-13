"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { maxRankLevel, rankTitle, getLevelByTitle, rankTitles } from "@/lib/rank-title";
import { RankBadge, RankIcon } from "@/components/rank-badge";
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
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(defaultNotifications);
  const [error, setError] = useState("");
  const [showGallery, setShowGallery] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error"; exiting: boolean }>>([]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
    }, 3500);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    api<Profile>("/users/me")
      .then(async (profileResult) => {
        const gameResult = await api<GamificationProfile>(
          `/gamification/profile/${profileResult.id}`
        );
        hydrateProfile(profileResult);
        setGameProfile(gameResult);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "讀取個人資料失敗"));
  }, []);

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

  const currentLevel = gameProfile?.level ?? profile?.level ?? 1;
  const isMaxRank = currentLevel >= maxRankLevel;

  function hydrateProfile(nextProfile: Profile) {
    setProfile(nextProfile);
    setName(nextProfile.name);
    setBio(nextProfile.bio ?? "");
    setNotificationSettings({
      ...defaultNotifications,
      ...(nextProfile.notificationSettings ?? {})
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    try {
      const updated = await api<Profile>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          bio,
          notificationSettings
        })
      });
      hydrateProfile(updated);
      saveSession(updated);
      showToast("個人設定儲存成功。");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "儲存失敗", "error");
    }
  }

  function toggleNotification(key: keyof NotificationSettings) {
    setNotificationSettings((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  async function handleEquipBadge(badgeId: string, isActive: boolean) {
    try {
      const updated = await api<GamificationProfile>("/gamification/equip-badge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          badgeId: isActive ? null : badgeId
        })
      });
      setGameProfile(updated);
      showToast(isActive ? "已取消配戴成就" : "已成功配戴成就");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "設定配戴成就失敗", "error");
    }
  }

  if (!profile) {
    return <p className={error ? "error" : "notice"}>{error || "載入設定中..."}</p>;
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <span className="page-kicker">Profile</span>
          <h1>個人資料</h1>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {/* Dashboard KPI Indicators */}
      <div
        className="kpi-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "24px",
          marginBottom: "8px"
        }}
      >
        {/* KPI 1: Level & Rank */}
        <div className="panel stack" style={{ gap: "12px", padding: "24px" }}>
          <span className="label" style={{ fontSize: "11px" }}>當前等級</span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <RankIcon level={currentLevel} size={28} style={{ color: "var(--primary)" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                {rankTitle(currentLevel)}
              </h3>
              <span className="muted" style={{ fontSize: "12px" }}>Level {currentLevel}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Equipped Badge */}
        <div className="panel stack" style={{ gap: "12px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="label" style={{ fontSize: "11px" }}>配戴成就</span>
            <button
              type="button"
              className="link-button"
              onClick={() => setShowBadgeModal(true)}
              style={{
                fontSize: "11px",
                color: "var(--primary)",
                padding: "2px 6px",
                fontWeight: 600
              }}
            >
              更換
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", minHeight: "42px" }}>
            {gameProfile?.activeBadge ? (
              <RankBadge
                level={getLevelByTitle(gameProfile.activeBadge.name)}
                text={gameProfile.activeBadge.name}
                className="badge"
                style={{
                  backgroundColor: "rgba(2, 132, 199, 0.08)",
                  color: "var(--primary)",
                  borderColor: "rgba(2, 132, 199, 0.25)",
                  padding: "6px 14px",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
                onClick={() => setShowBadgeModal(true)}
              />
            ) : (
              <span
                className="muted"
                style={{ fontSize: "13px", cursor: "pointer" }}
                onClick={() => setShowBadgeModal(true)}
              >
                尚未配戴成就 (點擊選取)
              </span>
            )}
          </div>
        </div>

        {/* KPI 3: EXP Progress */}
        <div className="panel stack" style={{ gap: "10px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="label" style={{ fontSize: "11px" }}>EXP 進度</span>
            <strong style={{ fontSize: "12px", color: "var(--primary)" }}>
              {gameProfile?.exp ?? profile.xp ?? 0} EXP
            </strong>
          </div>
          <div className="progress" style={{ height: "8px", margin: "4px 0" }}>
            <span style={{ width: `${levelProgress}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="subtle" style={{ fontSize: "11px" }}>
              {isMaxRank
                ? "最高稱號"
                : `差 ${Math.max(0, nextLevelXp - (gameProfile?.exp ?? profile.xp ?? 0))} EXP 升級`}
            </span>
            <button
              type="button"
              className="link-button"
              onClick={() => setShowGallery(true)}
              style={{
                fontSize: "11px",
                color: "var(--primary)",
                padding: "2px 6px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <span>圖鑑</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          </div>
        </div>

        {/* KPI 4: Completion Rate */}
        <div className="panel stack" style={{ gap: "12px", padding: "24px" }}>
          <span className="label" style={{ fontSize: "11px" }}>驗收完成率</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "var(--primary)" }}>
              {profile.stats.completionRate}%
            </h3>
            <span className="muted" style={{ fontSize: "12px" }}>
              已完成 {profile.stats.completedCount} 次
            </span>
          </div>
        </div>
      </div>

      <div className="split">
        <form className="stack" style={{ gap: "24px" }} onSubmit={submit}>
          {/* Panel 1: Basic Information */}
          <section className="panel stack" style={{ gap: "20px" }}>
            <div>
              <h2>基本資料</h2>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: "14px" }}>
                帳號信箱: {profile.email}
              </p>
            </div>

            <label className="field">
              <span className="label">姓名</span>
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="label">個人簡介</span>
              <textarea
                className="textarea"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="介紹一下你自己吧..."
                style={{ minHeight: "120px" }}
              />
            </label>
          </section>

          {/* Panel 2: My Skill Tags */}
          <section className="panel stack" style={{ gap: "12px" }}>
            <h2>我的技能標籤</h2>
            <TagStrip values={profile.skillTags ?? []} emptyText="尚未設定技能標籤。" />
          </section>

          {/* Panel 3: Notification Settings */}
          <section className="panel stack" style={{ gap: "20px" }}>
            <h2>通知管道設定</h2>
            <div className="toggle-grid">
              <ToggleRow
                checked={notificationSettings.email}
                label="Email 通知提醒"
                onChange={() => toggleNotification("email")}
              />
              <ToggleRow
                checked={notificationSettings.taskUpdates}
                label="任務招募與狀態更新"
                onChange={() => toggleNotification("taskUpdates")}
              />
              <ToggleRow
                checked={notificationSettings.reviewResults}
                label="任務提交驗收結果通知"
                onChange={() => toggleNotification("reviewResults")}
              />
            </div>

            <div className="actions" style={{ borderTop: "1px solid var(--line)", paddingTop: "20px" }}>
              <button className="button" type="submit">
                儲存變更
              </button>
            </div>
          </section>
        </form>

        <aside className="stack" style={{ gap: "24px" }}>
          {/* Stats Box */}
          <section className="panel stack" style={{ gap: "14px" }}>
            <h2>任務統計資料</h2>
            <div className="stat-grid">
              <Stat label="驗收完成率" value={`${profile.stats.completionRate}%`} />
              <Stat label="已完成次數" value={profile.stats.completedCount} />
              <Stat label="進行中任務" value={profile.stats.inProgressCount} />
              <Stat label="待驗收任務" value={profile.stats.reviewCount} />
              <Stat label="申請中任務" value={profile.stats.applicationCount} />
              <Stat label="累計提交" value={profile.stats.submissionCount} />
            </div>
          </section>

          {/* EXP History */}
          <section className="panel stack" style={{ gap: "14px" }}>
            <h2>EXP 紀錄</h2>
            {gameProfile?.recentExp.length ? (
              <div className="list" style={{ gap: "8px" }}>
                {gameProfile.recentExp.map((item) => (
                  <div
                    className="record"
                    key={item.id}
                    style={{
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.01)",
                      border: "1px solid var(--line)"
                    }}
                  >
                    <div className="row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px" }}>{item.reason}</span>
                      <strong style={{ color: "var(--primary)" }}>+{item.amount} EXP</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ padding: "24px" }}>目前沒有 EXP 紀錄。</div>
            )}
          </section>
        </aside>
      </div>

      {showGallery && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: "20px"
          }}
          onClick={() => setShowGallery(false)}
        >
          <div
            className="panel stack"
            style={{
              width: "min(480px, 100%)",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "32px",
              gap: "24px",
              boxShadow: "0 24px 64px rgba(15, 23, 42, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              position: "relative",
              background: "#ffffff"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "20px" }}>稱號等級圖鑑</h2>
              <button
                type="button"
                className="link-button"
                onClick={() => setShowGallery(false)}
                style={{ padding: "4px 8px", fontSize: "14px", fontWeight: 700, color: "var(--muted)" }}
              >
                關閉
              </button>
            </div>
            
            <div style={{ display: "grid", gap: "12px" }}>
              {rankTitles.map((titleName, index) => {
                const lvl = index + 1;
                const reqXp = [0, 300, 700, 1200, 1800, 2500, 3300, 4200][index];
                const isUnlocked = currentLevel >= lvl;
                return (
                  <div
                    key={titleName}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 16px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--line)",
                      background: isUnlocked ? "rgba(2, 132, 199, 0.04)" : "transparent",
                      opacity: isUnlocked ? 1 : 0.55
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className="label" style={{ fontSize: "11px", color: isUnlocked ? "var(--primary)" : "var(--subtle)" }}>
                        Lv.{lvl}
                      </span>
                      <RankBadge
                        level={lvl}
                        style={{
                          backgroundColor: "transparent",
                          borderColor: "transparent",
                          padding: 0,
                          fontSize: "14px",
                          fontWeight: isUnlocked ? 700 : 500,
                          color: isUnlocked ? "var(--foreground)" : "var(--subtle)"
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                      {reqXp} EXP
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showBadgeModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: "20px"
          }}
          onClick={() => setShowBadgeModal(false)}
        >
          <div
            className="panel stack"
            style={{
              width: "min(520px, 100%)",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "32px",
              gap: "24px",
              boxShadow: "0 24px 64px rgba(15, 23, 42, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              position: "relative",
              background: "#ffffff"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>選擇配戴成就</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowBadgeModal(false)}
                title="關閉"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className="muted" style={{ fontSize: "14px", margin: 0, lineHeight: "1.6" }}>
              選取的成就將會展示於您的個人名牌與個人資料頁頂端。再次點擊已配戴的成就可取消配戴。
            </p>

            <div style={{ display: "grid", gap: "16px" }}>
              {gameProfile?.badges.length ? (
                gameProfile.badges.map((item) => {
                  const isActive = gameProfile.activeBadge?.id === item.badge.id;
                  const level = getLevelByTitle(item.badge.name);
                  return (
                    <div
                      key={item.badge.id}
                      onClick={() => handleEquipBadge(item.badge.id, isActive)}
                      className={`badge-item-card ${isActive ? "active" : ""}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px 20px",
                        borderRadius: "var(--radius-lg)",
                        border: "2px solid var(--line)",
                        cursor: "pointer",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        background: isActive ? "rgba(2, 132, 199, 0.03)" : "rgba(255, 255, 255, 0.6)",
                        borderColor: isActive ? "var(--primary)" : "var(--line)",
                        gap: "16px"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, minWidth: 0 }}>
                        {/* Left Side: Beautiful Squircle with Vector Icon */}
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "12px",
                            display: "grid",
                            placeItems: "center",
                            background: isActive ? "rgba(2, 132, 199, 0.1)" : "rgba(15, 23, 42, 0.03)",
                            color: isActive ? "var(--primary)" : "var(--muted)",
                            transition: "all 0.2s ease",
                            flexShrink: 0
                          }}
                        >
                          <RankIcon level={level} size={22} />
                        </div>

                        {/* Middle: Name, Description & Short tag */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: "16px", color: isActive ? "var(--primary)" : "var(--foreground)" }}>
                              {item.badge.name}
                            </span>
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: isActive ? "rgba(2, 132, 199, 0.15)" : "rgba(15, 23, 42, 0.05)",
                                color: isActive ? "var(--primary)" : "var(--muted)",
                                fontWeight: 600,
                                letterSpacing: "0.02em"
                              }}
                            >
                              {item.badge.icon}
                            </span>
                          </div>
                          <span className="muted" style={{ fontSize: "13px", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {item.badge.description}
                          </span>
                        </div>
                      </div>

                      {/* Right Side: Radio/Check Indicator */}
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          border: "2px solid",
                          borderColor: isActive ? "var(--primary)" : "rgba(15, 23, 42, 0.15)",
                          background: isActive ? "var(--primary)" : "transparent",
                          display: "grid",
                          placeItems: "center",
                          color: "#ffffff",
                          transition: "all 0.2s ease",
                          flexShrink: 0
                        }}
                      >
                        {isActive && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty" style={{ padding: "32px" }}>
                  <p style={{ margin: 0, fontSize: "14px" }}>您目前尚未解鎖任何成就。</p>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: "12px" }}>快去承接並完成任務來解鎖吧！</p>
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--line)", paddingTop: "16px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="button"
                onClick={() => setShowBadgeModal(false)}
                style={{ padding: "10px 24px", fontSize: "14px" }}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-item ${toast.type} ${toast.exiting ? "exiting" : ""}`}
          >
            {toast.type === "success" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#10b981", flexShrink: 0 }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#f43f5e", flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            <span style={{ lineHeight: "1.4" }}>{toast.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ToggleRow({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="toggle-row">
      <input checked={checked} type="checkbox" onChange={onChange} />
      <span style={{ fontSize: "14px" }}>{label}</span>
    </label>
  );
}

function TagStrip({ values, emptyText }: { values: ProfileTag[]; emptyText: string }) {
  if (values.length === 0) {
    return <p className="muted" style={{ fontSize: "13px", margin: 0 }}>{emptyText}</p>;
  }

  return (
    <div className="badge-strip">
      {values.map((value) => (
        <span className="badge" key={value.id} style={{ borderColor: "rgba(2, 132, 199, 0.25)", color: "var(--primary)" }}>
          {value.name}
        </span>
      ))}
    </div>
  );
}
