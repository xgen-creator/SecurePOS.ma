// Auto-generated Supabase Types
// Generated: April 9, 2026
// Project: ScanBell_2026 (nrmfqjrwewyvvnkxwxww)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: Database["public"]["Enums"]["access_action"]
          confidence: number | null
          created_at: string | null
          device_id: string
          geo_location: Json | null
          id: string
          ip_address: unknown
          method: Database["public"]["Enums"]["auth_method"]
          property_id: string
          status: Database["public"]["Enums"]["access_status"]
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["access_action"]
          confidence?: number | null
          created_at?: string | null
          device_id: string
          geo_location?: Json | null
          id?: string
          ip_address?: unknown
          method: Database["public"]["Enums"]["auth_method"]
          property_id: string
          status: Database["public"]["Enums"]["access_status"]
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["access_action"]
          confidence?: number | null
          created_at?: string | null
          device_id?: string
          geo_location?: Json | null
          id?: string
          ip_address?: unknown
          method?: Database["public"]["Enums"]["auth_method"]
          property_id?: string
          status?: Database["public"]["Enums"]["access_status"]
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          created_at: string | null
          details: Json
          event_type: string
          id: string
          ip_address: unknown
          severity: Database["public"]["Enums"]["severity"] | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details: Json
          event_type: string
          id?: string
          ip_address?: unknown
          severity?: Database["public"]["Enums"]["severity"] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json
          event_type?: string
          id?: string
          ip_address?: unknown
          severity?: Database["public"]["Enums"]["severity"] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string | null
          firmware: string | null
          id: string
          last_seen: string | null
          name: string
          property_id: string
          serial_number: string
          settings: Json | null
          status: Database["public"]["Enums"]["device_status"] | null
          type: Database["public"]["Enums"]["device_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          firmware?: string | null
          id?: string
          last_seen?: string | null
          name: string
          property_id: string
          serial_number: string
          settings?: Json | null
          status?: Database["public"]["Enums"]["device_status"] | null
          type: Database["public"]["Enums"]["device_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          firmware?: string | null
          id?: string
          last_seen?: string | null
          name?: string
          property_id?: string
          serial_number?: string
          settings?: Json | null
          status?: Database["public"]["Enums"]["device_status"] | null
          type?: Database["public"]["Enums"]["device_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          created_at: string | null
          id: string
          name: string
          owner_id: string
          settings: Json | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          created_at: string | null
          device_id: string
          duration: number | null
          id: string
          metadata: Json | null
          thumbnail_url: string | null
          type: Database["public"]["Enums"]["recording_type"]
          url: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          duration?: number | null
          id?: string
          metadata?: Json | null
          thumbnail_url?: string | null
          type: Database["public"]["Enums"]["recording_type"]
          url: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          duration?: number | null
          id?: string
          metadata?: Json | null
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["recording_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "recordings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          device_info: Json
          expires_at: string
          id: string
          is_valid: boolean | null
          refresh_token: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info: Json
          expires_at: string
          id?: string
          is_valid?: boolean | null
          refresh_token: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json
          expires_at?: string
          id?: string
          is_valid?: boolean | null
          refresh_token?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          availability: Json | null
          created_at: string | null
          device_id: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          last_scan_at: string | null
          metadata: Json | null
          name: string
          property_id: string
          scan_count: number | null
          settings: Json | null
          tag_code: string
          updated_at: string | null
        }
        Insert: {
          availability?: Json | null
          created_at?: string | null
          device_id?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          last_scan_at?: string | null
          metadata?: Json | null
          name: string
          property_id: string
          scan_count?: number | null
          settings?: Json | null
          tag_code: string
          updated_at?: string | null
        }
        Update: {
          availability?: Json | null
          created_at?: string | null
          device_id?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          last_scan_at?: string | null
          metadata?: Json | null
          name?: string
          property_id?: string
          scan_count?: number | null
          settings?: Json | null
          tag_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar: string | null
          backup_codes: string[] | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
        }
        Insert: {
          avatar?: string | null
          backup_codes?: string[] | null
          created_at?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar?: string | null
          backup_codes?: string[] | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      visitors: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"] | null
          created_at: string | null
          email: string | null
          face_descriptor: string
          face_image_url: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          phone: string | null
          property_id: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          created_at?: string | null
          email?: string | null
          face_descriptor: string
          face_image_url?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          phone?: string | null
          property_id: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          created_at?: string | null
          email?: string | null
          face_descriptor?: string
          face_image_url?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          property_id?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitors_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
      access_action: "ENTRY" | "EXIT" | "DENIED" | "DELIVERY" | "VISITOR"
      access_level: "GUEST" | "CONTRACTOR" | "EMPLOYEE" | "FAMILY" | "ADMIN"
      access_status: "SUCCESS" | "FAILURE" | "PENDING" | "TIMEOUT"
      auth_method: "FACIAL_RECOGNITION" | "QR_CODE" | "NFC" | "PIN" | "MANUAL" | "REMOTE"
      device_status: "ONLINE" | "OFFLINE" | "ERROR" | "UPDATING"
      device_type: "DOORBELL" | "CAMERA" | "LOCK" | "SENSOR" | "HUB"
      recording_type: "VIDEO" | "AUDIO" | "SNAPSHOT" | "EVENT"
      severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL"
      user_role: "ADMIN" | "OWNER" | "MANAGER" | "VIEWER"
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
      access_action: ["ENTRY", "EXIT", "DENIED", "DELIVERY", "VISITOR"],
      access_level: ["GUEST", "CONTRACTOR", "EMPLOYEE", "FAMILY", "ADMIN"],
      access_status: ["SUCCESS", "FAILURE", "PENDING", "TIMEOUT"],
      auth_method: ["FACIAL_RECOGNITION", "QR_CODE", "NFC", "PIN", "MANUAL", "REMOTE"],
      device_status: ["ONLINE", "OFFLINE", "ERROR", "UPDATING"],
      device_type: ["DOORBELL", "CAMERA", "LOCK", "SENSOR", "HUB"],
      recording_type: ["VIDEO", "AUDIO", "SNAPSHOT", "EVENT"],
      severity: ["INFO", "WARNING", "ERROR", "CRITICAL"],
      user_role: ["ADMIN", "OWNER", "MANAGER", "VIEWER"],
    },
  },
} as const
