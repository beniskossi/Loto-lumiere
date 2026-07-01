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
      achievements: {
        Row: {
          category: string
          created_at: string | null
          description: string
          icon: string | null
          id: string
          name: string
          points: number | null
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          icon?: string | null
          id?: string
          name: string
          points?: number | null
          requirement_type: string
          requirement_value: number
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          icon?: string | null
          id?: string
          name?: string
          points?: number | null
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      algorithm_config: {
        Row: {
          algorithm_name: string
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          parameters: Json | null
          updated_at: string
          weight: number
        }
        Insert: {
          algorithm_name: string
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          parameters?: Json | null
          updated_at?: string
          weight?: number
        }
        Update: {
          algorithm_name?: string
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          parameters?: Json | null
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      algorithm_performance: {
        Row: {
          accuracy_score: number
          confidence_score: number | null
          created_at: string
          data_points_used: number | null
          draw_date: string
          draw_name: string
          execution_time: number | null
          f1_score: number | null
          factors: string[] | null
          id: string
          matches_count: number
          model_used: string
          precision_score: number | null
          predicted_numbers: number[]
          prediction_date: string
          prediction_score: number | null
          recall_score: number | null
          winning_numbers: number[]
        }
        Insert: {
          accuracy_score?: number
          confidence_score?: number | null
          created_at?: string
          data_points_used?: number | null
          draw_date: string
          draw_name: string
          execution_time?: number | null
          f1_score?: number | null
          factors?: string[] | null
          id?: string
          matches_count?: number
          model_used: string
          precision_score?: number | null
          predicted_numbers: number[]
          prediction_date: string
          prediction_score?: number | null
          recall_score?: number | null
          winning_numbers: number[]
        }
        Update: {
          accuracy_score?: number
          confidence_score?: number | null
          created_at?: string
          data_points_used?: number | null
          draw_date?: string
          draw_name?: string
          execution_time?: number | null
          f1_score?: number | null
          factors?: string[] | null
          id?: string
          matches_count?: number
          model_used?: string
          precision_score?: number | null
          predicted_numbers?: number[]
          prediction_date?: string
          prediction_score?: number | null
          recall_score?: number | null
          winning_numbers?: number[]
        }
        Relationships: []
      }
      algorithm_training_history: {
        Row: {
          algorithm_name: string
          created_at: string
          id: string
          new_parameters: Json | null
          new_weight: number
          performance_improvement: number | null
          previous_parameters: Json | null
          previous_weight: number
          training_date: string
          training_metrics: Json | null
        }
        Insert: {
          algorithm_name: string
          created_at?: string
          id?: string
          new_parameters?: Json | null
          new_weight: number
          performance_improvement?: number | null
          previous_parameters?: Json | null
          previous_weight: number
          training_date?: string
          training_metrics?: Json | null
        }
        Update: {
          algorithm_name?: string
          created_at?: string
          id?: string
          new_parameters?: Json | null
          new_weight?: number
          performance_improvement?: number | null
          previous_parameters?: Json | null
          previous_weight?: number
          training_date?: string
          training_metrics?: Json | null
        }
        Relationships: []
      }
      collaborative_prediction_votes: {
        Row: {
          created_at: string
          id: string
          prediction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prediction_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prediction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_prediction_votes_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "collaborative_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_predictions: {
        Row: {
          created_at: string
          draw_name: string
          id: string
          predicted_numbers: number[]
          updated_at: string
          user_id: string
          votes_count: number
        }
        Insert: {
          created_at?: string
          draw_name: string
          id?: string
          predicted_numbers: number[]
          updated_at?: string
          user_id: string
          votes_count?: number
        }
        Update: {
          created_at?: string
          draw_name?: string
          id?: string
          predicted_numbers?: number[]
          updated_at?: string
          user_id?: string
          votes_count?: number
        }
        Relationships: []
      }
      draw_results: {
        Row: {
          created_at: string | null
          draw_date: string
          draw_day: string
          draw_name: string
          draw_time: string
          id: string
          machine_numbers: number[] | null
          updated_at: string | null
          winning_numbers: number[]
        }
        Insert: {
          created_at?: string | null
          draw_date: string
          draw_day: string
          draw_name: string
          draw_time: string
          id?: string
          machine_numbers?: number[] | null
          updated_at?: string | null
          winning_numbers: number[]
        }
        Update: {
          created_at?: string | null
          draw_date?: string
          draw_day?: string
          draw_name?: string
          draw_time?: string
          id?: string
          machine_numbers?: number[] | null
          updated_at?: string | null
          winning_numbers?: number[]
        }
        Relationships: []
      }
      number_statistics: {
        Row: {
          associated_numbers: Json | null
          days_since_last: number | null
          draw_name: string
          frequency: number | null
          id: string
          last_appearance: string | null
          number: number
          updated_at: string | null
        }
        Insert: {
          associated_numbers?: Json | null
          days_since_last?: number | null
          draw_name: string
          frequency?: number | null
          id?: string
          last_appearance?: string | null
          number: number
          updated_at?: string | null
        }
        Update: {
          associated_numbers?: Json | null
          days_since_last?: number | null
          draw_name?: string
          frequency?: number | null
          id?: string
          last_appearance?: string | null
          number?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      orchestration_history: {
        Row: {
          adjustment_date: string
          adjustment_strategy: string
          algorithms_analyzed: Json
          created_at: string
          draw_date: string
          draw_name: string
          expected_improvement: number | null
          id: string
          notes: string | null
          parameter_adjustments: Json
          trigger_metrics: Json
          weight_adjustments: Json
        }
        Insert: {
          adjustment_date?: string
          adjustment_strategy: string
          algorithms_analyzed?: Json
          created_at?: string
          draw_date: string
          draw_name: string
          expected_improvement?: number | null
          id?: string
          notes?: string | null
          parameter_adjustments?: Json
          trigger_metrics?: Json
          weight_adjustments?: Json
        }
        Update: {
          adjustment_date?: string
          adjustment_strategy?: string
          algorithms_analyzed?: Json
          created_at?: string
          draw_date?: string
          draw_name?: string
          expected_improvement?: number | null
          id?: string
          notes?: string | null
          parameter_adjustments?: Json
          trigger_metrics?: Json
          weight_adjustments?: Json
        }
        Relationships: []
      }
      precalculated_predictions: {
        Row: {
          algorithm_reason: string | null
          calculated_at: string
          created_at: string | null
          data_quality: number | null
          draw_name: string
          enhanced_narratives: string[] | null
          expires_at: string
          explanations: Json | null
          formulas_breakdown: Json | null
          freshness: number | null
          historical_count: number | null
          id: string
          optimized_prediction: Json | null
          predictions: Json
          selected_algorithm: string | null
          top_pairs: Json | null
          warning: string | null
        }
        Insert: {
          algorithm_reason?: string | null
          calculated_at?: string
          created_at?: string | null
          data_quality?: number | null
          draw_name: string
          enhanced_narratives?: string[] | null
          expires_at?: string
          explanations?: Json | null
          formulas_breakdown?: Json | null
          freshness?: number | null
          historical_count?: number | null
          id?: string
          optimized_prediction?: Json | null
          predictions: Json
          selected_algorithm?: string | null
          top_pairs?: Json | null
          warning?: string | null
        }
        Update: {
          algorithm_reason?: string | null
          calculated_at?: string
          created_at?: string | null
          data_quality?: number | null
          draw_name?: string
          enhanced_narratives?: string[] | null
          expires_at?: string
          explanations?: Json | null
          formulas_breakdown?: Json | null
          freshness?: number | null
          historical_count?: number | null
          id?: string
          optimized_prediction?: Json | null
          predictions?: Json
          selected_algorithm?: string | null
          top_pairs?: Json | null
          warning?: string | null
        }
        Relationships: []
      }
      prediction_config: {
        Row: {
          config_key: string
          config_value: Json
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      prediction_shares: {
        Row: {
          id: string
          prediction_id: string
          share_platform: string
          shared_at: string
          user_id: string
        }
        Insert: {
          id?: string
          prediction_id: string
          share_platform: string
          shared_at?: string
          user_id: string
        }
        Update: {
          id?: string
          prediction_id?: string
          share_platform?: string
          shared_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_shares_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_tracking: {
        Row: {
          actual_numbers: number[] | null
          created_at: string | null
          draw_date: string | null
          draw_name: string
          id: string
          matches: number | null
          predicted_numbers: number[]
          prediction_date: string
          user_id: string | null
        }
        Insert: {
          actual_numbers?: number[] | null
          created_at?: string | null
          draw_date?: string | null
          draw_name: string
          id?: string
          matches?: number | null
          predicted_numbers: number[]
          prediction_date: string
          user_id?: string | null
        }
        Update: {
          actual_numbers?: number[] | null
          created_at?: string | null
          draw_date?: string | null
          draw_name?: string
          id?: string
          matches?: number | null
          predicted_numbers?: number[]
          prediction_date?: string
          user_id?: string | null
        }
        Relationships: []
      }
      predictions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          draw_name: string
          id: string
          model_metadata: Json | null
          model_used: string
          predicted_numbers: number[]
          prediction_date: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          draw_name: string
          id?: string
          model_metadata?: Json | null
          model_used: string
          predicted_numbers: number[]
          prediction_date: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          draw_name?: string
          id?: string
          model_metadata?: Json | null
          model_used?: string
          predicted_numbers?: number[]
          prediction_date?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scraping_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_date: string
          results_count: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_date: string
          results_count?: number | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_date?: string
          results_count?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      training_control: {
        Row: {
          auto_tune_enabled: boolean
          created_at: string
          id: string
          is_training_enabled: boolean
          last_training_run: string | null
          training_frequency_hours: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_tune_enabled?: boolean
          created_at?: string
          id?: string
          is_training_enabled?: boolean
          last_training_run?: string | null
          training_frequency_hours?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_tune_enabled?: boolean
          created_at?: string
          id?: string
          is_training_enabled?: boolean
          last_training_run?: string | null
          training_frequency_hours?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string | null
          id: string
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          id?: string
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          id?: string
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_numbers: {
        Row: {
          category: string | null
          created_at: string | null
          favorite_numbers: number[]
          id: string
          name: string | null
          notes: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          favorite_numbers: number[]
          id?: string
          name?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          favorite_numbers?: number[]
          id?: string
          name?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          draw_name: string
          favorite_numbers: number[]
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draw_name: string
          favorite_numbers: number[]
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draw_name?: string
          favorite_numbers?: number[]
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_prediction_feedback: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          matches: number | null
          prediction_id: string
          rating: number | null
          user_id: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          matches?: number | null
          prediction_id: string
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          matches?: number | null
          prediction_id?: string
          rating?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_prediction_tracking: {
        Row: {
          id: string
          marked_at: string
          notes: string | null
          prediction_id: string
          user_id: string
        }
        Insert: {
          id?: string
          marked_at?: string
          notes?: string | null
          prediction_id: string
          user_id: string
        }
        Update: {
          id?: string
          marked_at?: string
          notes?: string | null
          prediction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_prediction_tracking_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          custom_layout: Json | null
          has_completed_onboarding: boolean
          id: string
          notification_enabled: boolean
          preferred_algorithm: string | null
          preferred_draw_name: string | null
          theme_accent_color: string | null
          theme_primary_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_layout?: Json | null
          has_completed_onboarding?: boolean
          id?: string
          notification_enabled?: boolean
          preferred_algorithm?: string | null
          preferred_draw_name?: string | null
          theme_accent_color?: string | null
          theme_primary_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_layout?: Json | null
          has_completed_onboarding?: boolean
          id?: string
          notification_enabled?: boolean
          preferred_algorithm?: string | null
          preferred_draw_name?: string | null
          theme_accent_color?: string | null
          theme_primary_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      algorithm_rankings: {
        Row: {
          avg_accuracy: number | null
          best_match: number | null
          draw_name: string | null
          excellent_predictions: number | null
          first_prediction: string | null
          good_predictions: number | null
          last_prediction: string | null
          model_used: string | null
          perfect_predictions: number | null
          total_matches: number | null
          total_predictions: number | null
        }
        Relationships: []
      }
      algorithm_rankings_detailed: {
        Row: {
          accuracy_stddev: number | null
          avg_accuracy: number | null
          best_match: number | null
          consistency_score: number | null
          draw_name: string | null
          excellent_predictions: number | null
          f1_score: number | null
          first_prediction: string | null
          good_predictions: number | null
          last_prediction: string | null
          model_used: string | null
          outstanding_predictions: number | null
          overall_score: number | null
          perfect_predictions: number | null
          precision_rate: number | null
          recall_rate: number | null
          total_matches: number | null
          total_predictions: number | null
          worst_match: number | null
        }
        Relationships: []
      }
      mv_enhanced_stats: {
        Row: {
          avg_gap: number | null
          current_gap: number | null
          draw_name: string | null
          frequency: number | null
          last_seen: string | null
          number: number | null
          stddev_gap: number | null
          z_score: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_composite_score: {
        Args: { p_draw_name: string; p_numbers: number[] }
        Returns: Json
      }
      calculate_dynamic_optimal_gap: {
        Args: { p_draw_name: string }
        Returns: Json
      }
      cleanup_expired_predictions: { Args: never; Returns: undefined }
      count_array_matches: {
        Args: { arr1: number[]; arr2: number[] }
        Returns: number
      }
      get_algorithm_rankings_detailed: {
        Args: { p_draw_name?: string }
        Returns: {
          accuracy_stddev: number
          avg_accuracy: number
          best_match: number
          consistency_score: number
          draw_name: string
          excellent_predictions: number
          f1_score: number
          first_prediction: string
          good_predictions: number
          last_prediction: string
          model_used: string
          outstanding_predictions: number
          overall_score: number
          perfect_predictions: number
          precision_rate: number
          recall_rate: number
          total_matches: number
          total_predictions: number
          worst_match: number
        }[]
      }
      get_algorithm_trends: {
        Args: { p_draw_name?: string }
        Returns: {
          accuracy_score: number
          date: string
          matches_count: number
          model_used: string
        }[]
      }
      get_algorithm_trends_per_model: {
        Args: { p_draw_name?: string; p_limit_per_model?: number }
        Returns: {
          accuracy_score: number
          confidence_score: number
          date: string
          matches_count: number
          model_used: string
        }[]
      }
      get_enhanced_stats: {
        Args: { p_draw_name?: string; p_limit?: number }
        Returns: {
          avg_gap: number
          current_gap: number
          draw_name: string
          frequency: number
          last_seen: string
          number: number
          stddev_gap: number
          z_score: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      refresh_algorithm_rankings: { Args: never; Returns: undefined }
      refresh_enhanced_stats: { Args: never; Returns: undefined }
      validate_numbers_array: { Args: { numbers: number[] }; Returns: boolean }
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
      app_role: ["admin", "user"],
    },
  },
} as const
