export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      students: {
        Row: {
          id: string;
          email: string;
          name: string;
          grade: string;
          phone: string | null;
          approved: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          grade: string;
          phone?: string | null;
          approved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          grade?: string;
          phone?: string | null;
          approved?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      results: {
        Row: {
          id: number;
          student_id: string;
          paper: string;
          marks: number;
          total: number;
          date: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          student_id: string;
          paper: string;
          marks: number;
          total?: number;
          date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          student_id?: string;
          paper?: string;
          marks?: number;
          total?: number;
          date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "results_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
      quiz_scores: {
        Row: {
          id: number;
          student_id: string;
          grade: string;
          score: number;
          total: number;
          pct: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          student_id: string;
          grade: string;
          score: number;
          total: number;
          pct: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          student_id?: string;
          grade?: string;
          score?: number;
          total?: number;
          pct?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_scores_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
      teachers: {
        Row: {
          id: number;
          name: string;
          username: string;
          password_hash: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          username: string;
          password_hash: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          username?: string;
          password_hash?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notices: {
        Row: {
          id: number;
          message: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          message: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          message?: string;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      admins: {
        Row: {
          id: number;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
