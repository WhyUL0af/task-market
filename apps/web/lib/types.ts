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
  status: TaskStatus;
  creator: User;
  assignee?: User | null;
  assigneeId?: string | null;
  applications: TaskApplication[];
  submissions: TaskSubmission[];
  comments: Comment[];
};
