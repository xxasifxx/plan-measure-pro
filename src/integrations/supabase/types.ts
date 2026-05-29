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
      activity_relationships: {
        Row: {
          created_at: string
          id: string
          lag_days: number
          pred_activity_id: string
          project_id: string
          rel_type: string
          succ_activity_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lag_days?: number
          pred_activity_id: string
          project_id: string
          rel_type?: string
          succ_activity_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lag_days?: number
          pred_activity_id?: string
          project_id?: string
          rel_type?: string
          succ_activity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_relationships_pred_activity_id_fkey"
            columns: ["pred_activity_id"]
            isOneToOne: false
            referencedRelation: "schedule_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_relationships_succ_activity_id_fkey"
            columns: ["succ_activity_id"]
            isOneToOne: false
            referencedRelation: "schedule_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_resource_assignments: {
        Row: {
          activity_id: string
          actual_cost: number
          actual_units: number
          budgeted_cost: number
          budgeted_units: number
          created_at: string
          id: string
          project_id: string
          remaining_units: number
          resource_id: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          actual_cost?: number
          actual_units?: number
          budgeted_cost?: number
          budgeted_units?: number
          created_at?: string
          id?: string
          project_id: string
          remaining_units?: number
          resource_id: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          actual_cost?: number
          actual_units?: number
          budgeted_cost?: number
          budgeted_units?: number
          created_at?: string
          id?: string
          project_id?: string
          remaining_units?: number
          resource_id?: string
          updated_at?: string
        }
        Relationships: []
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
          work_date: string
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
          work_date?: string
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
          work_date?: string
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
      baseline_activities: {
        Row: {
          activity_code: string | null
          activity_id: string
          baseline_end: string | null
          baseline_id: string
          baseline_start: string | null
          budgeted_cost: number | null
          created_at: string
          duration_days: number | null
          id: string
          name: string | null
          percent_complete: number | null
          total_float_days: number | null
          wbs_code: string | null
        }
        Insert: {
          activity_code?: string | null
          activity_id: string
          baseline_end?: string | null
          baseline_id: string
          baseline_start?: string | null
          budgeted_cost?: number | null
          created_at?: string
          duration_days?: number | null
          id?: string
          name?: string | null
          percent_complete?: number | null
          total_float_days?: number | null
          wbs_code?: string | null
        }
        Update: {
          activity_code?: string | null
          activity_id?: string
          baseline_end?: string | null
          baseline_id?: string
          baseline_start?: string | null
          budgeted_cost?: number | null
          created_at?: string
          duration_days?: number | null
          id?: string
          name?: string | null
          percent_complete?: number | null
          total_float_days?: number | null
          wbs_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "baseline_activities_baseline_id_fkey"
            columns: ["baseline_id"]
            isOneToOne: false
            referencedRelation: "schedule_baselines"
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
      daily_report_comments: {
        Row: {
          body: string
          created_at: string
          daily_report_id: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          daily_report_id: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          daily_report_id?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_comments_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_snapshots: {
        Row: {
          archived_at: string
          archived_reason: string | null
          daily_report_id: string
          id: string
          project_id: string
          reject_reason: string | null
          snapshot: Json
        }
        Insert: {
          archived_at?: string
          archived_reason?: string | null
          daily_report_id: string
          id?: string
          project_id: string
          reject_reason?: string | null
          snapshot?: Json
        }
        Update: {
          archived_at?: string
          archived_reason?: string | null
          daily_report_id?: string
          id?: string
          project_id?: string
          reject_reason?: string | null
          snapshot?: Json
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          payload: Json
          project_id: string
          reject_reason: string | null
          rejected_at: string | null
          rejected_by: string | null
          report_date: string
          snapshot: Json
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          payload?: Json
          project_id: string
          reject_reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          report_date: string
          snapshot?: Json
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          payload?: Json
          project_id?: string
          reject_reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          report_date?: string
          snapshot?: Json
          status?: string
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
      device_tokens: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      document_folders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_system: boolean
          name: string
          parent_id: string | null
          project_id: string
          system_kind: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean
          name: string
          parent_id?: string | null
          project_id: string
          system_kind?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean
          name?: string
          parent_id?: string | null
          project_id?: string
          system_kind?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          folder_id: string
          id: string
          mime_type: string | null
          name: string
          project_id: string
          replaces_document_id: string | null
          size_bytes: number | null
          source_kind: string | null
          storage_path: string
          updated_at: string
          uploaded_by: string
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          folder_id: string
          id?: string
          mime_type?: string | null
          name: string
          project_id: string
          replaces_document_id?: string | null
          size_bytes?: number | null
          source_kind?: string | null
          storage_path: string
          updated_at?: string
          uploaded_by: string
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          folder_id?: string
          id?: string
          mime_type?: string | null
          name?: string
          project_id?: string
          replaces_document_id?: string | null
          size_bytes?: number | null
          source_kind?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_replaces_document_id_fkey"
            columns: ["replaces_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          project_id: string | null
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          project_id?: string | null
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          project_id?: string | null
          read_at?: string | null
          user_id?: string
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
          p6_activity_id: string | null
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
          p6_activity_id?: string | null
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
          p6_activity_id?: string | null
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
      project_schedule_meta: {
        Row: {
          calendar: Json
          data_date: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          calendar?: Json
          data_date?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          calendar?: Json
          data_date?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: []
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
          activity_id: string | null
          activity_type: string
          actual_finish: string | null
          actual_start: string | null
          baseline_end: string | null
          baseline_quantity: number | null
          baseline_start: string | null
          calendar_id: string | null
          constraint_date: string | null
          constraint_type: string | null
          created_at: string
          duration_days: number
          early_finish: string | null
          early_start: string | null
          id: string
          is_critical: boolean
          late_finish: string | null
          late_start: string | null
          manual_finish: boolean
          name: string
          parent_wbs_id: string | null
          pay_item_id: string | null
          percent_complete: number | null
          primary_resource_id: string | null
          project_id: string
          remaining_duration_days: number | null
          sort_order: number
          total_float_days: number | null
          updated_at: string
          wbs_code: string
        }
        Insert: {
          activity_id?: string | null
          activity_type?: string
          actual_finish?: string | null
          actual_start?: string | null
          baseline_end?: string | null
          baseline_quantity?: number | null
          baseline_start?: string | null
          calendar_id?: string | null
          constraint_date?: string | null
          constraint_type?: string | null
          created_at?: string
          duration_days?: number
          early_finish?: string | null
          early_start?: string | null
          id?: string
          is_critical?: boolean
          late_finish?: string | null
          late_start?: string | null
          manual_finish?: boolean
          name: string
          parent_wbs_id?: string | null
          pay_item_id?: string | null
          percent_complete?: number | null
          primary_resource_id?: string | null
          project_id: string
          remaining_duration_days?: number | null
          sort_order?: number
          total_float_days?: number | null
          updated_at?: string
          wbs_code: string
        }
        Update: {
          activity_id?: string | null
          activity_type?: string
          actual_finish?: string | null
          actual_start?: string | null
          baseline_end?: string | null
          baseline_quantity?: number | null
          baseline_start?: string | null
          calendar_id?: string | null
          constraint_date?: string | null
          constraint_type?: string | null
          created_at?: string
          duration_days?: number
          early_finish?: string | null
          early_start?: string | null
          id?: string
          is_critical?: boolean
          late_finish?: string | null
          late_start?: string | null
          manual_finish?: boolean
          name?: string
          parent_wbs_id?: string | null
          pay_item_id?: string | null
          percent_complete?: number | null
          primary_resource_id?: string | null
          project_id?: string
          remaining_duration_days?: number | null
          sort_order?: number
          total_float_days?: number | null
          updated_at?: string
          wbs_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_activities_parent_wbs_id_fkey"
            columns: ["parent_wbs_id"]
            isOneToOne: false
            referencedRelation: "schedule_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_baselines: {
        Row: {
          captured_at: string
          captured_by: string
          id: string
          name: string
          notes: string | null
          project_id: string
        }
        Insert: {
          captured_at?: string
          captured_by: string
          id?: string
          name: string
          notes?: string | null
          project_id: string
        }
        Update: {
          captured_at?: string
          captured_by?: string
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
        }
        Relationships: []
      }
      schedule_calendars: {
        Row: {
          created_at: string
          exceptions: Json
          hours_per_day: number
          id: string
          is_default: boolean
          name: string
          project_id: string
          updated_at: string
          workweek: Json
        }
        Insert: {
          created_at?: string
          exceptions?: Json
          hours_per_day?: number
          id?: string
          is_default?: boolean
          name: string
          project_id: string
          updated_at?: string
          workweek?: Json
        }
        Update: {
          created_at?: string
          exceptions?: Json
          hours_per_day?: number
          id?: string
          is_default?: boolean
          name?: string
          project_id?: string
          updated_at?: string
          workweek?: Json
        }
        Relationships: []
      }
      schedule_resources: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          max_units_per_day: number
          name: string
          project_id: string
          resource_code: string | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          unit: string
          updated_at: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          max_units_per_day?: number
          name: string
          project_id: string
          resource_code?: string | null
          resource_type?: Database["public"]["Enums"]["resource_type"]
          unit?: string
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          max_units_per_day?: number
          name?: string
          project_id?: string
          resource_code?: string | null
          resource_type?: Database["public"]["Enums"]["resource_type"]
          unit?: string
          updated_at?: string
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
      v_approved_pay_item_quantities: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          delta_quantity: number | null
          inspector_id: string | null
          item_code: string | null
          new_cumulative: number | null
          notes: string | null
          pay_item_id: string | null
          pay_item_name: string | null
          project_id: string | null
          report_date: string | null
          unit: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: { Args: { _token: string }; Returns: string }
      assign_owner_role: { Args: { _user_id: string }; Returns: undefined }
      capture_baseline: {
        Args: { p_name: string; p_notes?: string; p_project_id: string }
        Returns: string
      }
      delete_baseline: { Args: { p_baseline_id: string }; Returns: undefined }
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
      replace_project_schedule:
        | {
            Args: {
              p_acts: Json
              p_meta: Json
              p_project_id: string
              p_rels: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_acts: Json
              p_assignments?: Json
              p_calendars?: Json
              p_meta: Json
              p_project_id: string
              p_rels: Json
              p_resources?: Json
            }
            Returns: Json
          }
      seed_demo_users: { Args: never; Returns: Json }
      seed_project_standard_folders: {
        Args: { _project_id: string; _user: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "project_manager" | "inspector" | "resident_engineer"
      resource_type: "labor" | "material" | "equipment" | "nonlabor"
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
      app_role: ["admin", "project_manager", "inspector", "resident_engineer"],
      resource_type: ["labor", "material", "equipment", "nonlabor"],
    },
  },
} as const
