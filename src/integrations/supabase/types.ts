export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_assignments: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_assignments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "schedule_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_pay_items: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          pay_item_id: string
          project_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          pay_item_id: string
          project_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          pay_item_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_pay_items_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "schedule_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_pay_items_pay_item_id_fkey"
            columns: ["pay_item_id"]
            isOneToOne: false
            referencedRelation: "pay_items"
            referencedColumns: ["id"]
          },
        ]
      }
      annotation_photos: {
        Row: {
          ai_confidence: number | null
          ai_rationale: string | null
          ai_suggested_pay_item_id: string | null
          annotation_id: string | null
          confirmed: boolean
          created_at: string
          id: string
          project_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_rationale?: string | null
          ai_suggested_pay_item_id?: string | null
          annotation_id?: string | null
          confirmed?: boolean
          created_at?: string
          id?: string
          project_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          ai_confidence?: number | null
          ai_rationale?: string | null
          ai_suggested_pay_item_id?: string | null
          annotation_id?: string | null
          confirmed?: boolean
          created_at?: string
          id?: string
          project_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      annotations: {
        Row: {
          created_at: string
          depth: number | null
          id: string
          location: string | null
          manual_quantity: number | null
          measurement: number
          measurement_unit: string
          notes: string | null
          page: number
          pay_item_id: string | null
          points: Json
          project_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          depth?: number | null
          id?: string
          location?: string | null
          manual_quantity?: number | null
          measurement?: number
          measurement_unit?: string
          notes?: string | null
          page: number
          pay_item_id?: string | null
          points?: Json
          project_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          depth?: number | null
          id?: string
          location?: string | null
          manual_quantity?: number | null
          measurement?: number
          measurement_unit?: string
          notes?: string | null
          page?: number
          pay_item_id?: string | null
          points?: Json
          project_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "annotations_pay_item_id_fkey"
            columns: ["pay_item_id"]
            isOneToOne: false
            referencedRelation: "pay_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      calibrations: {
        Row: {
          created_at: string
          id: string
          page: number
          pixels_per_foot: number
          point1: Json
          point2: Json
          project_id: string
          real_distance: number
        }
        Insert: {
          created_at?: string
          id?: string
          page: number
          pixels_per_foot: number
          point1: Json
          point2: Json
          project_id: string
          real_distance: number
        }
        Update: {
          created_at?: string
          id?: string
          page?: number
          pixels_per_foot?: number
          point1?: Json
          point2?: Json
          project_id?: string
          real_distance?: number
        }
        Relationships: [
          {
            foreignKeyName: "calibrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          created_at: string
          id: string
          payload: Json
          project_id: string
          report_date: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          project_id: string
          report_date: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          project_id?: string
          report_date?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      demo_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          organization: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          organization: string
          role: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          organization?: string
          role?: string
        }
        Relationships: []
      }
      geo_calibrations: {
        Row: {
          control_points: Json
          created_at: string
          estimated_error_ft: number
          id: string
          page: number
          project_id: string
          transform_matrix: Json
          user_id: string
        }
        Insert: {
          control_points?: Json
          created_at?: string
          estimated_error_ft?: number
          id?: string
          page: number
          project_id: string
          transform_matrix?: Json
          user_id: string
        }
        Update: {
          control_points?: Json
          created_at?: string
          estimated_error_ft?: number
          id?: string
          page?: number
          project_id?: string
          transform_matrix?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_calibrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: []
      }
      pay_items: {
        Row: {
          color: string
          contract_quantity: number | null
          created_at: string
          drawable: boolean
          id: string
          item_code: string
          item_number: number
          name: string
          project_id: string
          unit: string
          unit_price: number
        }
        Insert: {
          color?: string
          contract_quantity?: number | null
          created_at?: string
          drawable?: boolean
          id?: string
          item_code: string
          item_number: number
          name: string
          project_id: string
          unit: string
          unit_price?: number
        }
        Update: {
          color?: string
          contract_quantity?: number | null
          created_at?: string
          drawable?: boolean
          id?: string
          item_code?: string
          item_number?: number
          name?: string
          project_id?: string
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pay_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          has_seen_welcome: boolean
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          has_seen_welcome?: boolean
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          has_seen_welcome?: boolean
          id?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          contract_number: string | null
          created_at: string
          created_by: string
          id: string
          is_bid: boolean
          name: string
          pdf_storage_path: string | null
          specs_storage_path: string | null
          toc: Json | null
          updated_at: string
        }
        Insert: {
          contract_number?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_bid?: boolean
          name: string
          pdf_storage_path?: string | null
          specs_storage_path?: string | null
          toc?: Json | null
          updated_at?: string
        }
        Update: {
          contract_number?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_bid?: boolean
          name?: string
          pdf_storage_path?: string | null
          specs_storage_path?: string | null
          toc?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      rocks: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          owner_user_id: string | null
          project_id: string
          quarter: string
          status: string
          target: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          owner_user_id?: string | null
          project_id: string
          quarter: string
          status?: string
          target?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          owner_user_id?: string | null
          project_id?: string
          quarter?: string
          status?: string
          target?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_activities: {
        Row: {
          baseline_end: string | null
          baseline_quantity: number | null
          baseline_start: string | null
          created_at: string
          id: string
          name: string
          pay_item_id: string | null
          percent_complete: number | null
          project_id: string
          updated_at: string
          wbs_code: string
        }
        Insert: {
          baseline_end?: string | null
          baseline_quantity?: number | null
          baseline_start?: string | null
          created_at?: string
          id?: string
          name: string
          pay_item_id?: string | null
          percent_complete?: number | null
          project_id: string
          updated_at?: string
          wbs_code: string
        }
        Update: {
          baseline_end?: string | null
          baseline_quantity?: number | null
          baseline_start?: string | null
          created_at?: string
          id?: string
          name?: string
          pay_item_id?: string | null
          percent_complete?: number | null
          project_id?: string
          updated_at?: string
          wbs_code?: string
        }
        Relationships: []
      }
      scorecard_metrics: {
        Row: {
          created_at: string
          id: string
          metric_key: string
          project_id: string
          target: number | null
          value: number | null
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_key: string
          project_id: string
          target?: number | null
          value?: number | null
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_key?: string
          project_id?: string
          target?: number | null
          value?: number | null
          week_start?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { _token: string }; Returns: string }
      assign_owner_role: { Args: { _user_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "project_manager" | "inspector"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "project_manager", "inspector"],
    },
  },
} as const
