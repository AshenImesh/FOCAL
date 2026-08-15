export type Student = {
  id: string;
  email: string;
  name: string;
  grade: string;
  phone: string | null;
  approved: boolean;
  created_at: string;
};

export type PaperResult = {
  id: number;
  student_id: string;
  paper: string;
  marks: number;
  total: number;
  date: string | null;
  created_at: string;
};

export type QuizScore = {
  id: number;
  student_id: string;
  grade: string;
  score: number;
  total: number;
  pct: number;
  created_at: string;
};

export type Teacher = {
  id: number;
  name: string;
  username: string;
  created_at: string;
};

export type Notice = {
  id: number;
  message: string;
  active: boolean;
  created_at: string;
};

export type Question = {
  q: string;
  o: string[];
  a: number;
  f: string;
};
