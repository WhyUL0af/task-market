import React from "react";
import { rankTitle } from "@/lib/rank-title";

interface RankIconProps {
  level: number;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function RankIcon({ level, size = 16, className, style }: RankIconProps) {
  const normalized = Math.min(Math.max(level, 1), 8);

  const iconStyle = {
    width: size,
    height: size,
    display: "inline-block",
    verticalAlign: "middle",
    flexShrink: 0,
    ...style,
  };

  switch (normalized) {
    case 1:
      return (
        <svg style={iconStyle} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c0 2-.52 3.5-1.6 9.2A7 7 0 0 1 11 20z" />
          <path d="M19 2c-2.26 4.33-5.27 7.14-8 8" />
        </svg>
      );
    case 2:
      return (
        <svg style={iconStyle} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
    case 3:
      return (
        <svg style={iconStyle} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 4:
      return (
        <svg style={iconStyle} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 5:
      return (
        <svg style={iconStyle} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case 6:
      return (
        <svg style={iconStyle} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );
    case 7:
      return (
        <svg style={iconStyle} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
          <path d="M3 20h18v2H3z" />
        </svg>
      );
    case 8:
    default:
      return (
        <svg style={iconStyle} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
          <path d="M12 2a6 6 0 0 1 6 6v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z" />
        </svg>
      );
  }
}

interface RankBadgeProps {
  level: number;
  showText?: boolean;
  iconSize?: number;
  style?: React.CSSProperties;
  className?: string;
  text?: string;
  onClick?: () => void;
}

export function RankBadge({ level, showText = true, iconSize = 13, style, className, text, onClick }: RankBadgeProps) {
  return (
    <span
      className={className || "level-badge"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        ...style,
      }}
      onClick={onClick}
    >
      <RankIcon level={level} size={iconSize} />
      {showText && <span>{text || rankTitle(level)}</span>}
    </span>
  );
}
