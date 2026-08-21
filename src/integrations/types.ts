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
      articles: {
        Row: {
          author_name: string | null
          body: string
          category: string | null
          cover_url: string | null
          created_at: string
          excerpt: string | null
          external_url: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          source: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          body?: string
          category?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          external_url?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          source?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          body?: string
          category?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          external_url?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          source?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          away_score: number
          away_team_id: string | null
          created_at: string
          game_date: string
          home_score: number
          home_team_id: string | null
          id: string
          is_home: boolean
          last_synced_at: string | null
          location: string | null
          opponent_team_id: string | null
          season: string
          sheet_csv_url: string | null
          sport: string
          stat_template: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          away_score?: number
          away_team_id?: string | null
          created_at?: string
          game_date: string
          home_score?: number
          home_team_id?: string | null
          id?: string
          is_home?: boolean
          last_synced_at?: string | null
          location?: string | null
          opponent_team_id?: string | null
          season?: string
          sheet_csv_url?: string | null
          sport?: string
          stat_template?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          away_score?: number
          away_team_id?: string | null
          created_at?: string
          game_date?: string
          home_score?: number
          home_team_id?: string | null
          id?: string
          is_home?: boolean
          last_synced_at?: string | null
          location?: string | null
          opponent_team_id?: string | null
          season?: string
          sheet_csv_url?: string | null
          sport?: string
          stat_template?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_opponent_team_id_fkey"
            columns: ["opponent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_posts: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          post_url: string
          sort_order: number
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          post_url: string
          sort_order?: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          post_url?: string
          sort_order?: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      player_game_stats: {
        Row: {
          created_at: string
          game_id: string
          id: string
          jersey_number: number | null
          player_id: string | null
          player_name: string
          stats: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          jersey_number?: number | null
          player_id?: string | null
          player_name: string
          stats?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          jersey_number?: number | null
          player_id?: string | null
          player_name?: string
          stats?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_game_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_game_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          full_name: string
          grade: string | null
          height: string | null
          id: string
          jersey_number: number | null
          photo_url: string | null
          position: string | null
          sport: string
          team_id: string | null
          updated_at: string
          weight: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          grade?: string | null
          height?: string | null
          id?: string
          jersey_number?: number | null
          photo_url?: string | null
          position?: string | null
          sport?: string
          team_id?: string | null
          updated_at?: string
          weight?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          grade?: string | null
          height?: string | null
          id?: string
          jersey_number?: number | null
          photo_url?: string | null
          position?: string | null
          sport?: string
          team_id?: string | null
          updated_at?: string
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: boolean
          instagram_handle: string | null
          tagline: string | null
          updated_at: string
          youtube_channel_id: string | null
          youtube_handle: string | null
        }
        Insert: {
          id?: boolean
          instagram_handle?: string | null
          tagline?: string | null
          updated_at?: string
          youtube_channel_id?: string | null
          youtube_handle?: string | null
        }
        Update: {
          id?: boolean
          instagram_handle?: string | null
          tagline?: string | null
          updated_at?: string
          youtube_channel_id?: string | null
          youtube_handle?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          id: string
          is_home_team: boolean
          logo_url: string | null
          name: string
          short_name: string | null
          sport: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_home_team?: boolean
          logo_url?: string | null
          name: string
          short_name?: string | null
          sport?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_home_team?: boolean
          logo_url?: string | null
          name?: string
          short_name?: string | null
          sport?: string
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
      increment_player_stat: {
        Args: {
          _delta: number
          _game_id: string
          _key: string
          _player_id: string
        }
        Returns: undefined
      }
      reset_player_stat: {
        Args: { _game_id: string; _key: string; _player_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "coach"
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
      app_role: ["admin", "coach"],
    },
  },
} as const
