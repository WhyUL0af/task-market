export type Role = "ADMIN" | "EMPLOYEE";
export type TaskStatus =
  | "DRAFT"
  | "OPEN"
  | "APPLIED"
  | "IN_PROGRESS"
  | "REVIEW"
  | "DONE"
  | "CANCELLED";

export type User = {
  id: string;
  email: string;
  name: string;
  bio?: string | null;
  skillTags?: ProfileTag[];
  notificationSettings?: NotificationSettings;
  role: Role;
  xp?: number;
  level?: number;
  badges?: UserBadge[];
};

export type NotificationSettings = {
  email: boolean;
  taskUpdates: boolean;
  reviewResults: boolean;
};

export type ProfileTagType = "SKILL";

export type ProfileTag = {
  id: string;
  name: string;
  type: ProfileTagType;
};

export type ProfileStats = {
  assignedCount: number;
  completedCount: number;
  inProgressCount: number;
  reviewCount: number;
  applicationCount: number;
  submissionCount: number;
  completionRate: number;
};

export type Profile = User & {
  stats: ProfileStats;
};

export type Badge = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
};

export type UserBadge = {
  id: string;
  earnedAt: string;
  active: boolean;
  badge: Badge;
};

export type ExpTransaction = {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
};

export type GamificationProfile = {
  id: string;
  email: string;
  name: string;
  exp: number;
  level: number;
  nextLevelExp: number;
  badges: UserBadge[];
  activeBadge?: Badge | null;
  recentExp: ExpTransaction[];
};

export type WeeklyChallenge = {
  id: string;
  code: string;
  title: string;
  description: string;
  metric: string;
  target: number;
  expReward: number;
  progress: number;
  completed: boolean;
};

export type TaskApplication = {
  id: string;
  message?: string | null;
  status: "PENDING" | "ACCEPTED" | "WAITLIST" | "REJECTED";
  applicant: User;
  requirement?: TaskRequirement | null;
  requirementId?: string | null;
  skillMatchScore?: number | null;
  workloadScore?: number | null;
  completionRateScore?: number | null;
  finalScore?: number | null;
  assignedBudget?: number | null;
  assignedXp?: number | null;
};

export type TaskSubmission = {
  id: string;
  content: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt?: string;
  employee: User;
};

export type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: User;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  reward?: number | null;
  dueAt?: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  xpReward: number;
  status: TaskStatus;
  creator: User;
  requirements: TaskRequirement[];
  applications: TaskApplication[];
  submissions: TaskSubmission[];
  comments: Comment[];
};

export type TaskRequirement = {
  id: string;
  name?: string | null;
  headcount: number;
  budgetPercent: number;
  xpPercent: number;
  skills: TaskRequirementSkill[];
};

export type TaskRequirementSkill = {
  id: string;
  skillTag: ProfileTag;
  skillTagId?: string;
};

export type AccessLog = {
  id: string;
  createdAt: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip?: string | null;
  userAgent?: string | null;
  referer?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
};

export type AccessLogResponse = {
  summary: {
    total: number;
    uniqueIps: number;
    authenticatedUsers: number;
  };
  rows: AccessLog[];
};
