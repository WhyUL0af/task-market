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
  preferredRoles?: ProfileTag[];
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

export type ProfileTagType = "SKILL" | "ROLE";

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
  badge: Badge;
};

export type Title = {
  id: string;
  code: string;
  name: string;
  description: string;
};

export type UserTitle = {
  id: string;
  earnedAt: string;
  active: boolean;
  title: Title;
};

export type ExpTransaction = {
  id: string;
  amount: number;
  reason: string;
  roleName?: string | null;
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
  titles: UserTitle[];
  activeTitle?: Title | null;
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
  status: "PENDING" | "APPROVED" | "ACCEPTED" | "WAITLIST" | "REJECTED";
  applicant: User;
  roleRequirement?: TaskRoleRequirement | null;
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
  difficulty: "EASY" | "MEDIUM" | "HARD";
  xpReward: number;
  status: TaskStatus;
  creator: User;
  assignee?: User | null;
  assigneeId?: string | null;
  roleRequirements: TaskRoleRequirement[];
  applications: TaskApplication[];
  submissions: TaskSubmission[];
  comments: Comment[];
};

export type TaskRoleRequirement = {
  id: string;
  headcount: number;
  budgetPercent: number;
  xpPercent: number;
  roleTag: ProfileTag;
  skillTags: Array<{ id: string; skillTag: ProfileTag }>;
  assignee?: User | null;
  assigneeId?: string | null;
};
