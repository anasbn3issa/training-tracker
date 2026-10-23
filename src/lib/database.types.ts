export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      exercises: {
        Row: {
          id: string;
          increment_kg: number;
          load_type: Database["public"]["Enums"]["load_type"];
          name: string;
        };
        ComputedFields: never;
        Insert: {
          id: string;
          increment_kg: number;
          load_type: Database["public"]["Enums"]["load_type"];
          name: string;
        };
        Update: {
          id?: string;
          increment_kg?: number;
          load_type?: Database["public"]["Enums"]["load_type"];
          name?: string;
        };
        Relationships: [];
      };
      program_days: {
        Row: {
          code: string;
          name: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          name: string;
          weekday: number;
        };
        Update: {
          code?: string;
          name?: string;
          weekday?: number;
        };
        Relationships: [];
      };
      program_exercises: {
        Row: {
          base_sets: number;
          day_code: string;
          exercise_id: string;
          id: number;
          note: string | null;
          position: number;
          rep_high: number;
          rep_low: number;
        };
        ComputedFields: never;
        Insert: {
          base_sets: number;
          day_code: string;
          exercise_id: string;
          id?: number;
          note?: string | null;
          position: number;
          rep_high: number;
          rep_low: number;
        };
        Update: {
          base_sets?: number;
          day_code?: string;
          exercise_id?: string;
          id?: number;
          note?: string | null;
          position?: number;
          rep_high?: number;
          rep_low?: number;
        };
        Relationships: [
          {
            foreignKeyName: "program_exercises_day_code_fkey";
            columns: ["day_code"];
            isOneToOne: false;
            referencedRelation: "program_days";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "program_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      runs: {
        Row: {
          date: string;
          distance_km: number;
          duration_sec: number;
          effort: number | null;
          id: string;
          kind: Database["public"]["Enums"]["run_kind"];
          notes: string | null;
        };
        ComputedFields: never;
        Insert: {
          date: string;
          distance_km: number;
          duration_sec: number;
          effort?: number | null;
          id: string;
          kind: Database["public"]["Enums"]["run_kind"];
          notes?: string | null;
        };
        Update: {
          date?: string;
          distance_km?: number;
          duration_sec?: number;
          effort?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["run_kind"];
          notes?: string | null;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          block_week: number;
          completed_at: string | null;
          date: string;
          day_code: string;
          id: string;
          notes: string | null;
        };
        ComputedFields: never;
        Insert: {
          block_week: number;
          completed_at?: string | null;
          date: string;
          day_code: string;
          id: string;
          notes?: string | null;
        };
        Update: {
          block_week?: number;
          completed_at?: string | null;
          date?: string;
          day_code?: string;
          id?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_day_code_fkey";
            columns: ["day_code"];
            isOneToOne: false;
            referencedRelation: "program_days";
            referencedColumns: ["code"];
          },
        ];
      };
      set_logs: {
        Row: {
          done_at: string;
          exercise_id: string;
          id: string;
          reps: number;
          session_id: string;
          set_index: number;
          weight_kg: number | null;
        };
        ComputedFields: never;
        Insert: {
          done_at: string;
          exercise_id: string;
          id: string;
          reps: number;
          session_id: string;
          set_index: number;
          weight_kg?: number | null;
        };
        Update: {
          done_at?: string;
          exercise_id?: string;
          id?: string;
          reps?: number;
          session_id?: string;
          set_index?: number;
          weight_kg?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "set_logs_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "set_logs_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          block_start_date: string;
          id: boolean;
        };
        ComputedFields: never;
        Insert: {
          block_start_date: string;
          id?: boolean;
        };
        Update: {
          block_start_date?: string;
          id?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      load_type: "barbell" | "dumbbell_per_hand" | "machine" | "bodyweight" | "bodyweight_plus";
      run_kind: "easy" | "long" | "intervals" | "race";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      load_type: ["barbell", "dumbbell_per_hand", "machine", "bodyweight", "bodyweight_plus"],
      run_kind: ["easy", "long", "intervals", "race"],
    },
  },
} as const;
