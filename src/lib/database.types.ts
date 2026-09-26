/**
 * Database types for supabase-js (`createClient<Database>`).
 *
 * Mirrors supabase/migrations/*. Same structure as `supabase gen types
 * typescript`, so `npm run db:types` (local stack running) regenerates this
 * file in place. CI's `db` job generates types from the real schema and
 * type-checks the app against them, so drift fails the build either way.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      ai_trending_cache: {
        Row: {
          city_names: Json;
          id: number;
          prompt_version: number;
          updated_at: string;
        };
        Insert: {
          city_names?: NonNullable<Json>;
          id?: number;
          prompt_version: number;
          updated_at?: string;
        };
        Update: {
          city_names?: NonNullable<Json>;
          id?: number;
          prompt_version?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_admins: {
        Row: {
          created_at: string;
          email: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      cache_hit_stats: {
        Row: {
          cache_type: string;
          event_date: string;
          hit_count: number;
          miss_count: number;
        };
        Insert: {
          cache_type: string;
          event_date?: string;
          hit_count?: number;
          miss_count?: number;
        };
        Update: {
          cache_type?: string;
          event_date?: string;
          hit_count?: number;
          miss_count?: number;
        };
        Relationships: [];
      };
      cities: {
        Row: {
          admin_name: string;
          capital: string;
          city: string;
          city_ascii: string;
          country: string;
          created_at: string;
          id: number;
          iso2: string;
          iso3: string;
          lat: number;
          lng: number;
          population: number;
          search_document: unknown;
          slug: string;
          updated_at: string;
        };
        Insert: {
          admin_name?: string;
          capital?: string;
          city: string;
          city_ascii: string;
          country: string;
          created_at?: string;
          id: number;
          iso2: string;
          iso3: string;
          lat: number;
          lng: number;
          population?: number;
          search_document?: never;
          slug: string;
          updated_at?: string;
        };
        Update: {
          admin_name?: string;
          capital?: string;
          city?: string;
          city_ascii?: string;
          country?: string;
          created_at?: string;
          id?: number;
          iso2?: string;
          iso3?: string;
          lat?: number;
          lng?: number;
          population?: number;
          search_document?: never;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cities_iso2_iso3_country_fkey";
            columns: ["iso2", "iso3", "country"];
            isOneToOne: false;
            referencedRelation: "countries";
            referencedColumns: ["iso2", "iso3", "name"];
          },
        ];
      };
      city_ai_insights: {
        Row: {
          attractions: Json;
          city_id: number;
          intro: string;
          prompt_version: number;
          seasons: Json;
          updated_at: string;
          weather: Json;
        };
        Insert: {
          attractions?: NonNullable<Json>;
          city_id: number;
          intro: string;
          prompt_version: number;
          seasons?: NonNullable<Json>;
          updated_at?: string;
          weather?: NonNullable<Json>;
        };
        Update: {
          attractions?: NonNullable<Json>;
          city_id?: number;
          intro?: string;
          prompt_version?: number;
          seasons?: NonNullable<Json>;
          updated_at?: string;
          weather?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "city_ai_insights_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: true;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
      city_aliases: {
        Row: {
          alias: string;
          city_id: number;
        };
        Insert: {
          alias: string;
          city_id: number;
        };
        Update: {
          alias?: string;
          city_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "city_aliases_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
      city_live_metrics: {
        Row: {
          city_id: number;
          climate_comfort: string | null;
          pollution_pm25: number | null;
          source: Json;
          updated_at: string;
        };
        Insert: {
          city_id: number;
          climate_comfort?: string | null;
          pollution_pm25?: number | null;
          source?: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          city_id?: number;
          climate_comfort?: string | null;
          pollution_pm25?: number | null;
          source?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "city_live_metrics_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: true;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
      city_places_cache: {
        Row: {
          city_id: number;
          place_type: string;
          places_data: Json;
          updated_at: string;
        };
        Insert: {
          city_id: number;
          place_type: string;
          places_data?: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          city_id?: number;
          place_type?: string;
          places_data?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "city_places_cache_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
      city_views_daily: {
        Row: {
          city_id: number;
          stat_date: string;
          views: number;
        };
        Insert: {
          city_id: number;
          stat_date: string;
          views?: number;
        };
        Update: {
          city_id?: number;
          stat_date?: string;
          views?: number;
        };
        Relationships: [
          {
            foreignKeyName: "city_views_daily_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
      city_weather_cache: {
        Row: {
          aqi: number;
          aqi_label: string;
          city_id: number;
          description: string;
          feels_like: number;
          humidity: number;
          icon: string;
          temp: number;
          temp_max: number;
          temp_min: number;
          updated_at: string;
          wind_speed: number;
        };
        Insert: {
          aqi: number;
          aqi_label: string;
          city_id: number;
          description: string;
          feels_like: number;
          humidity: number;
          icon: string;
          temp: number;
          temp_max: number;
          temp_min: number;
          updated_at?: string;
          wind_speed: number;
        };
        Update: {
          aqi?: number;
          aqi_label?: string;
          city_id?: number;
          description?: string;
          feels_like?: number;
          humidity?: number;
          icon?: string;
          temp?: number;
          temp_max?: number;
          temp_min?: number;
          updated_at?: string;
          wind_speed?: number;
        };
        Relationships: [
          {
            foreignKeyName: "city_weather_cache_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: true;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
      countries: {
        Row: {
          capital: string | null;
          continent: string | null;
          created_at: string;
          iso2: string;
          iso3: string;
          name: string;
          population: number | null;
          updated_at: string;
        };
        Insert: {
          capital?: string | null;
          continent?: string | null;
          created_at?: string;
          iso2: string;
          iso3: string;
          name: string;
          population?: number | null;
          updated_at?: string;
        };
        Update: {
          capital?: string | null;
          continent?: string | null;
          created_at?: string;
          iso2?: string;
          iso3?: string;
          name?: string;
          population?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      country_indicators: {
        Row: {
          homicide_rate_per_100k: number | null;
          homicide_year: number | null;
          imported_at: string;
          iso2: string;
          physicians_per_1000: number | null;
          physicians_year: number | null;
          price_level_index: number | null;
          price_level_year: number | null;
          source: Json;
        };
        Insert: {
          homicide_rate_per_100k?: number | null;
          homicide_year?: number | null;
          imported_at?: string;
          iso2: string;
          physicians_per_1000?: number | null;
          physicians_year?: number | null;
          price_level_index?: number | null;
          price_level_year?: number | null;
          source?: NonNullable<Json>;
        };
        Update: {
          homicide_rate_per_100k?: number | null;
          homicide_year?: number | null;
          imported_at?: string;
          iso2?: string;
          physicians_per_1000?: number | null;
          physicians_year?: number | null;
          price_level_index?: number | null;
          price_level_year?: number | null;
          source?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "country_indicators_iso2_fkey";
            columns: ["iso2"];
            isOneToOne: true;
            referencedRelation: "countries";
            referencedColumns: ["iso2"];
          },
        ];
      };
      daily_visitor_stats: {
        Row: {
          bounced_sessions: number;
          created_at: string;
          new_visitors: number;
          page_views: number;
          returning_visitors: number;
          sessions: number;
          sessions_ended: number;
          stat_date: string;
          total_session_duration_sec: number;
          updated_at: string;
        };
        Insert: {
          bounced_sessions?: number;
          created_at?: string;
          new_visitors?: number;
          page_views?: number;
          returning_visitors?: number;
          sessions?: number;
          sessions_ended?: number;
          stat_date: string;
          total_session_duration_sec?: number;
          updated_at?: string;
        };
        Update: {
          bounced_sessions?: number;
          created_at?: string;
          new_visitors?: number;
          page_views?: number;
          returning_visitors?: number;
          sessions?: number;
          sessions_ended?: number;
          stat_date?: string;
          total_session_duration_sec?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      device_stats_daily: {
        Row: {
          browser: string;
          device_type: string;
          os: string;
          stat_date: string;
          visits: number;
        };
        Insert: {
          browser?: string;
          device_type: string;
          os?: string;
          stat_date: string;
          visits?: number;
        };
        Update: {
          browser?: string;
          device_type?: string;
          os?: string;
          stat_date?: string;
          visits?: number;
        };
        Relationships: [];
      };
      geo_stats_daily: {
        Row: {
          city: string;
          country_code: string;
          country_name: string;
          stat_date: string;
          visits: number;
        };
        Insert: {
          city?: string;
          country_code: string;
          country_name: string;
          stat_date: string;
          visits?: number;
        };
        Update: {
          city?: string;
          country_code?: string;
          country_name?: string;
          stat_date?: string;
          visits?: number;
        };
        Relationships: [];
      };
      place_saves_daily: {
        Row: {
          day: string;
          place_id: string;
          saves: number;
        };
        Insert: {
          day?: string;
          place_id: string;
          saves?: number;
        };
        Update: {
          day?: string;
          place_id?: string;
          saves?: number;
        };
        Relationships: [];
      };
      provider_daily_usage: {
        Row: {
          day: string;
          provider: string;
          updated_at: string;
          used: number;
        };
        Insert: {
          day: string;
          provider: string;
          updated_at?: string;
          used?: number;
        };
        Update: {
          day?: string;
          provider?: string;
          updated_at?: string;
          used?: number;
        };
        Relationships: [];
      };
      traffic_sources_daily: {
        Row: {
          new_visitors: number;
          source_name: string;
          source_type: string;
          stat_date: string;
          visits: number;
        };
        Insert: {
          new_visitors?: number;
          source_name: string;
          source_type: string;
          stat_date: string;
          visits?: number;
        };
        Update: {
          new_visitors?: number;
          source_name?: string;
          source_type?: string;
          stat_date?: string;
          visits?: number;
        };
        Relationships: [];
      };
      user_actions_daily: {
        Row: {
          action_count: number;
          action_type: string;
          stat_date: string;
        };
        Insert: {
          action_count?: number;
          action_type: string;
          stat_date: string;
        };
        Update: {
          action_count?: number;
          action_type?: string;
          stat_date?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      city_metrics: {
        Row: {
          city_id: number | null;
          climate_comfort: string | null;
          cost_index: number | null;
          health_access_per_100k: number | null;
          homicide_rate_per_100k: number | null;
          pollution_pm25: number | null;
          source: Json | null;
          updated_at: string | null;
        };
        Relationships: [];
      };
      daily_visitor_summary: {
        Row: {
          avg_session_duration_sec: number | null;
          bounce_rate_pct: number | null;
          new_visitors: number | null;
          page_views: number | null;
          returning_visitors: number | null;
          sessions: number | null;
          sessions_ended: number | null;
          stat_date: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      claim_provider_use: {
        Args: { p_day: string; p_limit: number; p_provider: string };
        Returns: boolean;
      };
      get_cities_by_traffic: {
        Args: { lookback_days?: number; result_limit?: number };
        Returns: {
          city_id: number;
          views: number;
        }[];
      };
      get_place_save_totals: {
        Args: { p_place_ids: string[] };
        Returns: {
          place_id: string;
          total: number;
        }[];
      };
      record_cache_event: {
        Args: { p_cache_type: string; p_is_hit: boolean };
        Returns: undefined;
      };
      record_place_save: {
        Args: { p_place_id: string };
        Returns: undefined;
      };
      search_cities: {
        Args: { query: string; result_limit?: number };
        Returns: {
          admin_name: string;
          capital: string;
          city: string;
          city_ascii: string;
          country: string;
          id: number;
          iso2: string;
          iso3: string;
          lat: number;
          lng: number;
          match_type: string;
          population: number;
          rank_score: number;
          slug: string;
        }[];
      };
      upsert_city_views: {
        Args: { p_city_id: number; p_date: string };
        Returns: undefined;
      };
      upsert_daily_visitor_stats: {
        Args: {
          p_bounced_sessions: number;
          p_date: string;
          p_new_visitors: number;
          p_page_views: number;
          p_returning_visitors: number;
          p_session_duration_sec: number;
          p_sessions: number;
          p_sessions_ended: number;
        };
        Returns: undefined;
      };
      upsert_device_stats: {
        Args: { p_browser: string; p_date: string; p_device: string; p_os: string };
        Returns: undefined;
      };
      upsert_geo_stats: {
        Args: {
          p_city?: string;
          p_country_code: string;
          p_country_name: string;
          p_date: string;
        };
        Returns: undefined;
      };
      upsert_traffic_source: {
        Args: {
          p_date: string;
          p_new_visitors?: number;
          p_source_name: string;
          p_source_type: string;
          p_visits?: number;
        };
        Returns: undefined;
      };
      upsert_user_action: {
        Args: { p_action: string; p_date: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"] | keyof PublicSchema["Views"]> =
  T extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][T]["Row"]
    : T extends keyof PublicSchema["Views"]
      ? PublicSchema["Views"][T]["Row"]
      : never;

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
