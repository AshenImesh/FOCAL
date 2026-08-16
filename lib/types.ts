export type Role = "student" | "teacher" | "admin";
export type Status = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  full_name: string | null;
  grade: number | null;
  phone: string | null;
  role: Role;
  status: Status;
  created_at: string;
}

export interface Paper {
  id: string;
  student_id: string;
  paper_name: string;
  marks: number;
  total: number;
  date: string | null;
  created_at: string;
}

export interface QuizScore {
  id: string;
  student_id: string;
  grade: number;
  score: number;
  total: number;
  pct: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  grade: number;
  question: string;
  options: string[];
  answer: number;
  feedback: string | null;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  active: boolean;
  created_at: string;
}

export interface UserRequest {
  id: number;
  user_id: string;
  kind: "email" | "grade";
  current_value: string;
  requested_value: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  resolved_at: string | null;
}

export interface ContactRequest {
  id: number;
  name: string | null;
  phone: string;
  message: string;
  created_at: string;
}

export interface Teacher {
  id: string;
  full_name: string;
  username: string;
  created_at: string;
}

export interface Prediction {
  slope: number;
  predicted: number;
  trend: "improving" | "steady" | "declining";
}

export interface PaperRow extends Paper {
  pct: number;
}

export interface ScoreRow extends QuizScore {
  profiles: { full_name: string | null } | null;
}
