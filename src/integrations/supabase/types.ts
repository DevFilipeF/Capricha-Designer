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
      fonts: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string
          family_name: string | null
          file_size_bytes: number
          id: string
          license_confirmed: boolean
          mime_type: string | null
          original_filename: string
          postscript_name: string | null
          sha256: string
          status: string
          storage_path: string
          style: string
          subfamily_name: string | null
          updated_at: string
          validation_error: string | null
          weight: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name: string
          family_name?: string | null
          file_size_bytes: number
          id?: string
          license_confirmed?: boolean
          mime_type?: string | null
          original_filename: string
          postscript_name?: string | null
          sha256: string
          status?: string
          storage_path: string
          style?: string
          subfamily_name?: string | null
          updated_at?: string
          validation_error?: string | null
          weight?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string
          family_name?: string | null
          file_size_bytes?: number
          id?: string
          license_confirmed?: boolean
          mime_type?: string | null
          original_filename?: string
          postscript_name?: string | null
          sha256?: string
          status?: string
          storage_path?: string
          style?: string
          subfamily_name?: string | null
          updated_at?: string
          validation_error?: string | null
          weight?: number
        }
        Relationships: []
      }
      generation_items: {
        Row: {
          age: number | null
          generation_id: string
          id: string
          name: string
          quantity: number
          rendered_values: Json
          sort_order: number
          template_id: string | null
        }
        Insert: {
          age?: number | null
          generation_id: string
          id?: string
          name: string
          quantity?: number
          rendered_values?: Json
          sort_order?: number
          template_id?: string | null
        }
        Update: {
          age?: number | null
          generation_id?: string
          id?: string
          name?: string
          quantity?: number
          rendered_values?: Json
          sort_order?: number
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_items_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          created_at: string
          created_by: string | null
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          input_snapshot: Json
          output_file_path: string | null
          output_size_bytes: number | null
          preset_snapshot: Json
          started_at: string | null
          status: string
          total_items: number
          total_pages: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_snapshot?: Json
          output_file_path?: string | null
          output_size_bytes?: number | null
          preset_snapshot?: Json
          started_at?: string | null
          status?: string
          total_items?: number
          total_pages?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_snapshot?: Json
          output_file_path?: string | null
          output_size_bytes?: number | null
          preset_snapshot?: Json
          started_at?: string | null
          status?: string
          total_items?: number
          total_pages?: number
        }
        Relationships: []
      }
      presets: {
        Row: {
          config_json: Json
          created_at: string
          id: string
          revision: number
          schema_version: number
          template_id: string
          updated_at: string
          validation_errors: Json
          validation_status: string
        }
        Insert: {
          config_json?: Json
          created_at?: string
          id?: string
          revision?: number
          schema_version?: number
          template_id: string
          updated_at?: string
          validation_errors?: Json
          validation_status?: string
        }
        Update: {
          config_json?: Json
          created_at?: string
          id?: string
          revision?: number
          schema_version?: number
          template_id?: string
          updated_at?: string
          validation_errors?: Json
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "presets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: true
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          page_count: number
          page_height: number
          page_rotation: number
          page_width: number
          slug: string
          source_file_path: string
          status: string
          theme: string | null
          thumbnail_path: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          page_count?: number
          page_height: number
          page_rotation?: number
          page_width: number
          slug: string
          source_file_path: string
          status?: string
          theme?: string | null
          thumbnail_path?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          page_count?: number
          page_height?: number
          page_rotation?: number
          page_width?: number
          slug?: string
          source_file_path?: string
          status?: string
          theme?: string | null
          thumbnail_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
