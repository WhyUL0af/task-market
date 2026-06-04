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
  role: Role;
  xp?: number;
  level?: number;
  badges?: UserBadge[];
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

export type TaskApplication = {
  id: string;
  message?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  applicant: User;
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
  applications: TaskApplication[];
  submissions: TaskSubmission[];
  comments: Comment[];
};
