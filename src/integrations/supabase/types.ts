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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_check_results: {
        Row: {
          captured_media_id: string
          check_type: Database["public"]["Enums"]["ai_check_type"]
          created_at: string
          id: string
          message: string | null
          passed: boolean
          score: number | null
          suggested_fix: string | null
        }
        Insert: {
          captured_media_id: string
          check_type: Database["public"]["Enums"]["ai_check_type"]
          created_at?: string
          id?: string
          message?: string | null
          passed: boolean
          score?: number | null
          suggested_fix?: string | null
        }
        Update: {
          captured_media_id?: string
          check_type?: Database["public"]["Enums"]["ai_check_type"]
          created_at?: string
          id?: string
          message?: string | null
          passed?: boolean
          score?: number | null
          suggested_fix?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_check_results_captured_media_id_fkey"
            columns: ["captured_media_id"]
            isOneToOne: false
            referencedRelation: "captured_media"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_profiles: {
        Row: {
          completion_message: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          intro_message: string | null
          logo_url: string | null
          primary_color: string | null
          request_heading: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completion_message?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          intro_message?: string | null
          logo_url?: string | null
          primary_color?: string | null
          request_heading?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completion_message?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          intro_message?: string | null
          logo_url?: string | null
          primary_color?: string | null
          request_heading?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "business_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      business_workspaces: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          name: string
          owner_id: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          slug: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          owner_id: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          owner_id?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      captured_media: {
        Row: {
          ai_feedback: Json | null
          confidence: number | null
          created_at: string
          extracted_text: string | null
          file_url: string | null
          id: string
          note: string | null
          status: string
          step_id: string | null
          submission_id: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          ai_feedback?: Json | null
          confidence?: number | null
          created_at?: string
          extracted_text?: string | null
          file_url?: string | null
          id?: string
          note?: string | null
          status?: string
          step_id?: string | null
          submission_id: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          ai_feedback?: Json | null
          confidence?: number | null
          created_at?: string
          extracted_text?: string | null
          file_url?: string | null
          id?: string
          note?: string | null
          status?: string
          step_id?: string | null
          submission_id?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "captured_media_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "guide_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captured_media_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      context_questions: {
        Row: {
          conditional_logic: Json | null
          created_at: string
          guide_id: string
          helper_text: string | null
          id: string
          input_type: string
          label: string
          options: Json | null
          order_index: number
          required: boolean
          updated_at: string
        }
        Insert: {
          conditional_logic?: Json | null
          created_at?: string
          guide_id: string
          helper_text?: string | null
          id?: string
          input_type?: string
          label: string
          options?: Json | null
          order_index: number
          required?: boolean
          updated_at?: string
        }
        Update: {
          conditional_logic?: Json | null
          created_at?: string
          guide_id?: string
          helper_text?: string | null
          id?: string
          input_type?: string
          label?: string
          options?: Json | null
          order_index?: number
          required?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_questions_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "photo_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_details: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          label: string
          required_for_readiness: boolean
          source_media_id: string | null
          submission_id: string
          type: string | null
          value: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          label: string
          required_for_readiness?: boolean
          source_media_id?: string | null
          submission_id: string
          type?: string | null
          value?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          label?: string
          required_for_readiness?: boolean
          source_media_id?: string | null
          submission_id?: string
          type?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_details_source_media_id_fkey"
            columns: ["source_media_id"]
            isOneToOne: false
            referencedRelation: "captured_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_details_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      founding_pro_claims: {
        Row: {
          claimed_at: string
          claimed_by: string
          workspace_id: string
        }
        Insert: {
          claimed_at?: string
          claimed_by: string
          workspace_id: string
        }
        Update: {
          claimed_at?: string
          claimed_by?: string
          workspace_id?: string
        }
        Relationships: []
      }
      guide_steps: {
        Row: {
          ai_checks: Database["public"]["Enums"]["ai_check_type"][]
          allow_skip: boolean
          capture_type: Database["public"]["Enums"]["capture_type"]
          created_at: string
          guide_id: string
          id: string
          instruction: string | null
          order_index: number
          overlay_type: Database["public"]["Enums"]["overlay_type"] | null
          required: boolean
          title: string
          updated_at: string
          why_it_matters: string | null
        }
        Insert: {
          ai_checks?: Database["public"]["Enums"]["ai_check_type"][]
          allow_skip?: boolean
          capture_type?: Database["public"]["Enums"]["capture_type"]
          created_at?: string
          guide_id: string
          id?: string
          instruction?: string | null
          order_index: number
          overlay_type?: Database["public"]["Enums"]["overlay_type"] | null
          required?: boolean
          title: string
          updated_at?: string
          why_it_matters?: string | null
        }
        Update: {
          ai_checks?: Database["public"]["Enums"]["ai_check_type"][]
          allow_skip?: boolean
          capture_type?: Database["public"]["Enums"]["capture_type"]
          created_at?: string
          guide_id?: string
          id?: string
          instruction?: string | null
          order_index?: number
          overlay_type?: Database["public"]["Enums"]["overlay_type"] | null
          required?: boolean
          title?: string
          updated_at?: string
          why_it_matters?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_steps_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "photo_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          submission_id: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          submission_id: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          submission_id?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "business_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          name: string
          subject: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          name: string
          subject?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          name?: string
          subject?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          type: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "business_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_brief_requests: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          custom_message: string | null
          due_date: string | null
          guide_id: string | null
          id: string
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          status: Database["public"]["Enums"]["request_status"]
          token: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          custom_message?: string | null
          due_date?: string | null
          guide_id?: string | null
          id?: string
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          token?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          custom_message?: string | null
          due_date?: string | null
          guide_id?: string | null
          id?: string
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          token?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_brief_requests_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "photo_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_brief_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "business_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_guides: {
        Row: {
          category: Database["public"]["Enums"]["topline_category"] | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_time_minutes: number | null
          id: string
          is_active: boolean
          is_global_template: boolean
          name: string
          nested_category: string | null
          output_type: Database["public"]["Enums"]["output_type"] | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["topline_category"] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_time_minutes?: number | null
          id?: string
          is_active?: boolean
          is_global_template?: boolean
          name: string
          nested_category?: string | null
          output_type?: Database["public"]["Enums"]["output_type"] | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["topline_category"] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_time_minutes?: number | null
          id?: string
          is_active?: boolean
          is_global_template?: boolean
          name?: string
          nested_category?: string | null
          output_type?: Database["public"]["Enums"]["output_type"] | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_guides_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "business_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_workspace_id: string | null
          email: string | null
          id: string
          last_login_at: string | null
          name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_workspace_id?: string | null
          email?: string | null
          id: string
          last_login_at?: string | null
          name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_workspace_id?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_workspace_fk"
            columns: ["default_workspace_id"]
            isOneToOne: false
            referencedRelation: "business_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      request_messages: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          id: string
          kind: string
          metadata: Json
          request_id: string
          sent_at: string
          sent_by: string | null
          subject: string | null
          to_address: string | null
          workspace_id: string
        }
        Insert: {
          body?: string | null
          channel?: string
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          request_id: string
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
          to_address?: string | null
          workspace_id: string
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          request_id?: string
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
          to_address?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          ai_summary: string | null
          created_at: string
          id: string
          next_action: string | null
          readiness_score: number | null
          request_id: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string | null
          submitter_contact: string | null
          submitter_name: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          id?: string
          next_action?: string | null
          readiness_score?: number | null
          request_id: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          submitter_contact?: string | null
          submitter_name?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          id?: string
          next_action?: string | null
          readiness_score?: number | null
          request_id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          submitter_contact?: string | null
          submitter_name?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "photo_brief_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "business_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string
          current_period_start: string
          environment: string
          id: string
          is_founding_pro: boolean
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          price_id: string | null
          renewal_date: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          billing_interval?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          environment?: string
          id?: string
          is_founding_pro?: boolean
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          price_id?: string | null
          renewal_date?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          billing_interval?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          environment?: string
          id?: string
          is_founding_pro?: boolean
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          price_id?: string | null
          renewal_date?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "business_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          related_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          related_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          related_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "business_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["member_role"]
          status: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          status?: string
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          status?: string
          token?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["member_role"]
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "business_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_period_usage: {
        Args: { _event_type: string; _workspace_id: string }
        Returns: number
      }
      founding_pro_remaining: { Args: never; Returns: number }
      has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["member_role"]
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean }
      plan_from_price_id: {
        Args: { _price_id: string }
        Returns: {
          billing_interval: string
          plan: Database["public"]["Enums"]["plan_tier"]
        }[]
      }
      plan_request_cap: {
        Args: { _plan: Database["public"]["Enums"]["plan_tier"] }
        Returns: number
      }
      plan_user_cap: {
        Args: { _plan: Database["public"]["Enums"]["plan_tier"] }
        Returns: number
      }
      request_id_for_token: { Args: never; Returns: string }
      run_data_retention: { Args: never; Returns: undefined }
    }
    Enums: {
      ai_check_type:
        | "blur"
        | "low_light"
        | "glare"
        | "unreadable_text"
        | "wrong_shot"
        | "cropped_subject"
        | "duplicate_image"
        | "missing_scale"
        | "missing_required_item"
        | "label_detected"
        | "serial_model_detected"
        | "receipt_order_detected"
        | "damage_visible"
        | "wide_shot_detected"
        | "close_up_detected"
        | "unsafe_condition_flag"
      capture_type:
        | "photo"
        | "video"
        | "document"
        | "label"
        | "note"
        | "measurement"
      member_role: "owner" | "admin" | "member"
      output_type:
        | "service_intake_brief"
        | "proof_packet"
        | "claim_packet"
        | "listing_draft"
        | "social_post_draft"
        | "condition_report"
        | "custom_brief"
      overlay_type:
        | "wide_scene"
        | "close_up"
        | "damage_closeup"
        | "document_label"
        | "model_serial_plate"
        | "receipt_order"
        | "before_after_alignment"
        | "square_product_crop"
        | "vertical_story_crop"
        | "scale_reference"
        | "video_motion"
        | "custom"
      plan_tier: "free" | "starter" | "pro" | "team" | "business"
      request_status:
        | "draft"
        | "sent"
        | "opened"
        | "in_progress"
        | "needs_customer_action"
        | "submitted"
        | "ready_to_review"
        | "reviewed"
        | "archived"
        | "expired"
      submission_status: "new" | "reviewed" | "needs_more" | "archived"
      topline_category:
        | "service_quote_intake"
        | "property_proof_records"
        | "product_support_claims"
        | "sales_marketing_content"
        | "custom_business_intake"
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
      ai_check_type: [
        "blur",
        "low_light",
        "glare",
        "unreadable_text",
        "wrong_shot",
        "cropped_subject",
        "duplicate_image",
        "missing_scale",
        "missing_required_item",
        "label_detected",
        "serial_model_detected",
        "receipt_order_detected",
        "damage_visible",
        "wide_shot_detected",
        "close_up_detected",
        "unsafe_condition_flag",
      ],
      capture_type: [
        "photo",
        "video",
        "document",
        "label",
        "note",
        "measurement",
      ],
      member_role: ["owner", "admin", "member"],
      output_type: [
        "service_intake_brief",
        "proof_packet",
        "claim_packet",
        "listing_draft",
        "social_post_draft",
        "condition_report",
        "custom_brief",
      ],
      overlay_type: [
        "wide_scene",
        "close_up",
        "damage_closeup",
        "document_label",
        "model_serial_plate",
        "receipt_order",
        "before_after_alignment",
        "square_product_crop",
        "vertical_story_crop",
        "scale_reference",
        "video_motion",
        "custom",
      ],
      plan_tier: ["free", "starter", "pro", "team", "business"],
      request_status: [
        "draft",
        "sent",
        "opened",
        "in_progress",
        "needs_customer_action",
        "submitted",
        "ready_to_review",
        "reviewed",
        "archived",
        "expired",
      ],
      submission_status: ["new", "reviewed", "needs_more", "archived"],
      topline_category: [
        "service_quote_intake",
        "property_proof_records",
        "product_support_claims",
        "sales_marketing_content",
        "custom_business_intake",
      ],
    },
  },
} as const
