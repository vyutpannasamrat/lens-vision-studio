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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      editing_projects: {
        Row: {
          captions: Json | null
          created_at: string | null
          edited_video_url: string | null
          id: string
          recording_id: string | null
          status: string | null
          timeline_data: Json | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          captions?: Json | null
          created_at?: string | null
          edited_video_url?: string | null
          id?: string
          recording_id?: string | null
          status?: string | null
          timeline_data?: Json | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          captions?: Json | null
          created_at?: string | null
          edited_video_url?: string | null
          id?: string
          recording_id?: string | null
          status?: string | null
          timeline_data?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editing_projects_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recording_sessions: {
        Row: {
          connection_type: string
          created_at: string
          ended_at: string | null
          id: string
          master_device_id: string | null
          metadata: Json | null
          session_code: string
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          user_id: string
        }
        Insert: {
          connection_type?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          master_device_id?: string | null
          metadata?: Json | null
          session_code: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          user_id: string
        }
        Update: {
          connection_type?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          master_device_id?: string | null
          metadata?: Json | null
          session_code?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          created_at: string
          duration: number | null
          id: string
          script_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          id?: string
          script_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          id?: string
          script_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "recordings_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          prompt: string | null
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          prompt?: string | null
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          prompt?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      session_devices: {
        Row: {
          angle_name: string | null
          capabilities: Json | null
          created_at: string
          device_id: string
          device_name: string
          id: string
          last_heartbeat: string | null
          role: Database["public"]["Enums"]["device_role"]
          session_id: string
          status: Database["public"]["Enums"]["device_status"]
          user_id: string
        }
        Insert: {
          angle_name?: string | null
          capabilities?: Json | null
          created_at?: string
          device_id: string
          device_name: string
          id?: string
          last_heartbeat?: string | null
          role: Database["public"]["Enums"]["device_role"]
          session_id: string
          status?: Database["public"]["Enums"]["device_status"]
          user_id: string
        }
        Update: {
          angle_name?: string | null
          capabilities?: Json | null
          created_at?: string
          device_id?: string
          device_name?: string
          id?: string
          last_heartbeat?: string | null
          role?: Database["public"]["Enums"]["device_role"]
          session_id?: string
          status?: Database["public"]["Enums"]["device_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_devices_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "recording_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_recordings: {
        Row: {
          angle_name: string | null
          created_at: string
          device_id: string
          id: string
          is_primary_angle: boolean | null
          recording_id: string | null
          session_id: string
          sync_offset_ms: number | null
        }
        Insert: {
          angle_name?: string | null
          created_at?: string
          device_id: string
          id?: string
          is_primary_angle?: boolean | null
          recording_id?: string | null
          session_id: string
          sync_offset_ms?: number | null
        }
        Update: {
          angle_name?: string | null
          created_at?: string
          device_id?: string
          id?: string
          is_primary_angle?: boolean | null
          recording_id?: string | null
          session_id?: string
          sync_offset_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_recordings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "session_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_recordings_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "recording_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      snapshots: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          recording_id: string | null
          taken_at: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          recording_id?: string | null
          taken_at?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          recording_id?: string | null
          taken_at?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      device_role: "master" | "camera"
      device_status: "connected" | "ready" | "recording" | "disconnected"
      session_status:
        | "waiting"
        | "ready"
        | "recording"
        | "stopped"
        | "completed"
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
      device_role: ["master", "camera"],
      device_status: ["connected", "ready", "recording", "disconnected"],
      session_status: ["waiting", "ready", "recording", "stopped", "completed"],
    },
  },
} as const
