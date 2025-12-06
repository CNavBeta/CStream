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
      actors: {
        Row: {
          biography: string | null
          birthday: string | null
          created_at: string | null
          id: string
          name: string
          place_of_birth: string | null
          popularity: number | null
          profile_path: string | null
          tmdb_id: number
          updated_at: string | null
        }
        Insert: {
          biography?: string | null
          birthday?: string | null
          created_at?: string | null
          id?: string
          name: string
          place_of_birth?: string | null
          popularity?: number | null
          profile_path?: string | null
          tmdb_id: number
          updated_at?: string | null
        }
        Update: {
          biography?: string | null
          birthday?: string | null
          created_at?: string | null
          id?: string
          name?: string
          place_of_birth?: string | null
          popularity?: number | null
          profile_path?: string | null
          tmdb_id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      admin: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          media_id: string | null
          media_type: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          media_id?: string | null
          media_type?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          media_id?: string | null
          media_type?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          response_time_ms: number | null
          role: string
          session_id: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          response_time_ms?: number | null
          role: string
          session_id: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          response_time_ms?: number | null
          role?: string
          session_id?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          model_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          model_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          model_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          episode_number: number | null
          id: string
          media_type: string
          parent_id: string | null
          season_number: number | null
          tmdb_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          episode_number?: number | null
          id?: string
          media_type: string
          parent_id?: string | null
          season_number?: number | null
          tmdb_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          episode_number?: number | null
          id?: string
          media_type?: string
          parent_id?: string | null
          season_number?: number | null
          tmdb_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_ai_models: {
        Row: {
          api_key_encrypted: string | null
          code_language: string
          code_snippet: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          endpoint_url: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          model_id: string
          name: string
          provider: string
          system_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          code_language?: string
          code_snippet?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          endpoint_url?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          model_id: string
          name: string
          provider: string
          system_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          code_language?: string
          code_snippet?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          endpoint_url?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          model_id?: string
          name?: string
          provider?: string
          system_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_media: {
        Row: {
          backdrop_path: string | null
          created_at: string
          created_by: string
          genres: string[] | null
          id: string
          media_type: string
          overview: string | null
          poster_path: string | null
          rating: number | null
          release_date: string | null
          status: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          backdrop_path?: string | null
          created_at?: string
          created_by: string
          genres?: string[] | null
          id?: string
          media_type: string
          overview?: string | null
          poster_path?: string | null
          rating?: number | null
          release_date?: string | null
          status?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          backdrop_path?: string | null
          created_at?: string
          created_by?: string
          genres?: string[] | null
          id?: string
          media_type?: string
          overview?: string | null
          poster_path?: string | null
          rating?: number | null
          release_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      episodes: {
        Row: {
          air_date: string | null
          created_at: string | null
          episode_number: number
          id: string
          name: string
          overview: string | null
          player_url: string | null
          runtime: number | null
          season_id: string
          season_number: number
          still_path: string | null
          tmdb_episode_id: number | null
          tv_show_id: string
          updated_at: string | null
          vote_average: number | null
        }
        Insert: {
          air_date?: string | null
          created_at?: string | null
          episode_number: number
          id?: string
          name: string
          overview?: string | null
          player_url?: string | null
          runtime?: number | null
          season_id: string
          season_number: number
          still_path?: string | null
          tmdb_episode_id?: number | null
          tv_show_id: string
          updated_at?: string | null
          vote_average?: number | null
        }
        Update: {
          air_date?: string | null
          created_at?: string | null
          episode_number?: number
          id?: string
          name?: string
          overview?: string | null
          player_url?: string | null
          runtime?: number | null
          season_id?: string
          season_number?: number
          still_path?: string | null
          tmdb_episode_id?: number | null
          tv_show_id?: string
          updated_at?: string | null
          vote_average?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodes_tv_show_id_fkey"
            columns: ["tv_show_id"]
            isOneToOne: false
            referencedRelation: "tv_shows"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          custom_media_id: string | null
          id: string
          media_id: string
          media_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_media_id?: string | null
          id?: string
          media_id: string
          media_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_media_id?: string | null
          id?: string
          media_id?: string
          media_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_custom_media_id_fkey"
            columns: ["custom_media_id"]
            isOneToOne: false
            referencedRelation: "custom_media"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string | null
          id: string
          receiver_code: string
          receiver_id: string | null
          sender_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          receiver_code: string
          receiver_id?: string | null
          sender_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          receiver_code?: string
          receiver_id?: string | null
          sender_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          creator_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      history: {
        Row: {
          episode_number: number | null
          id: string
          media_type: string
          progress: number | null
          season_number: number | null
          tmdb_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          episode_number?: number | null
          id?: string
          media_type: string
          progress?: number | null
          season_number?: number | null
          tmdb_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          episode_number?: number | null
          id?: string
          media_type?: string
          progress?: number | null
          season_number?: number | null
          tmdb_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      media_cast: {
        Row: {
          actor_id: string
          cast_order: number | null
          character_name: string | null
          created_at: string | null
          id: string
          media_id: string
          media_type: string
        }
        Insert: {
          actor_id: string
          cast_order?: number | null
          character_name?: string | null
          created_at?: string | null
          id?: string
          media_id: string
          media_type: string
        }
        Update: {
          actor_id?: string
          cast_order?: number | null
          character_name?: string | null
          created_at?: string | null
          id?: string
          media_id?: string
          media_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_cast_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string | null
          file_url: string | null
          group_id: string | null
          id: string
          is_ai: boolean | null
          is_read: boolean | null
          message_type: string | null
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          file_url?: string | null
          group_id?: string | null
          id?: string
          is_ai?: boolean | null
          is_read?: boolean | null
          message_type?: string | null
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          file_url?: string | null
          group_id?: string | null
          id?: string
          is_ai?: boolean | null
          is_read?: boolean | null
          message_type?: string | null
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          backdrop_path: string | null
          created_at: string | null
          custom_backdrop: string | null
          custom_overview: string | null
          custom_player: string | null
          custom_poster: string | null
          custom_title: string | null
          genre_ids: number[] | null
          id: string
          id_tmdb: number
          metadata: Json | null
          overview: string | null
          popularity: number | null
          poster_path: string | null
          release_date: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          updated_by: string | null
          visibility: boolean | null
          vote_average: number | null
          vote_count: number | null
        }
        Insert: {
          backdrop_path?: string | null
          created_at?: string | null
          custom_backdrop?: string | null
          custom_overview?: string | null
          custom_player?: string | null
          custom_poster?: string | null
          custom_title?: string | null
          genre_ids?: number[] | null
          id?: string
          id_tmdb: number
          metadata?: Json | null
          overview?: string | null
          popularity?: number | null
          poster_path?: string | null
          release_date?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
          visibility?: boolean | null
          vote_average?: number | null
          vote_count?: number | null
        }
        Update: {
          backdrop_path?: string | null
          created_at?: string | null
          custom_backdrop?: string | null
          custom_overview?: string | null
          custom_player?: string | null
          custom_poster?: string | null
          custom_title?: string | null
          genre_ids?: number[] | null
          id?: string
          id_tmdb?: number
          metadata?: Json | null
          overview?: string | null
          popularity?: number | null
          poster_path?: string | null
          release_date?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          visibility?: boolean | null
          vote_average?: number | null
          vote_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auto_translate: boolean | null
          avatar_url: string | null
          banner_url: string | null
          created_at: string
          friend_code: string
          friend_code_refreshes: number | null
          id: string
          is_admin: boolean | null
          last_friend_code_refresh: string | null
          role: string | null
          auth_provider: string | null
          language: string | null
          theme: string | null
          updated_at: string
          username: string
        }
        Insert: {
          auto_translate?: boolean | null
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          friend_code?: string
          friend_code_refreshes?: number | null
          id: string
          is_admin?: boolean | null
          last_friend_code_refresh?: string | null
          role?: string | null
          auth_provider?: string | null
          language?: string | null
          theme?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          auto_translate?: boolean | null
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          friend_code?: string
          friend_code_refreshes?: number | null
          id?: string
          is_admin?: boolean | null
          last_friend_code_refresh?: string | null
          role?: string | null
          auth_provider?: string | null
          language?: string | null
          theme?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string | null
          episode_number: number | null
          id: string
          media_type: string
          rating: number
          season_number: number | null
          tmdb_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          episode_number?: number | null
          id?: string
          media_type: string
          rating: number
          season_number?: number | null
          tmdb_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          episode_number?: number | null
          id?: string
          media_type?: string
          rating?: number
          season_number?: number | null
          tmdb_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      readers: {
        Row: {
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          episode_number: number | null
          id: string
          label: string
          language: string
          media_type: string
          order_index: number | null
          season_number: number | null
          tmdb_id: number
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          episode_number?: number | null
          id?: string
          label: string
          language?: string
          media_type: string
          order_index?: number | null
          season_number?: number | null
          tmdb_id: number
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          episode_number?: number | null
          id?: string
          label?: string
          language?: string
          media_type?: string
          order_index?: number | null
          season_number?: number | null
          tmdb_id?: number
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          page_url: string | null
          rating: number
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          page_url?: string | null
          rating: number
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          page_url?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          air_date: string | null
          created_at: string | null
          episode_count: number | null
          id: string
          name: string
          overview: string | null
          poster_path: string | null
          season_number: number
          tmdb_season_id: number | null
          tv_show_id: string
          updated_at: string | null
        }
        Insert: {
          air_date?: string | null
          created_at?: string | null
          episode_count?: number | null
          id?: string
          name: string
          overview?: string | null
          poster_path?: string | null
          season_number: number
          tmdb_season_id?: number | null
          tv_show_id: string
          updated_at?: string | null
        }
        Update: {
          air_date?: string | null
          created_at?: string | null
          episode_count?: number | null
          id?: string
          name?: string
          overview?: string | null
          poster_path?: string | null
          season_number?: number
          tmdb_season_id?: number | null
          tv_show_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_tv_show_id_fkey"
            columns: ["tv_show_id"]
            isOneToOne: false
            referencedRelation: "tv_shows"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          content: string
          created_at: string | null
          file_url: string | null
          id: string
          is_admin: boolean | null
          message_type: string | null
          sender_id: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_admin?: boolean | null
          message_type?: string | null
          sender_id: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_admin?: boolean | null
          message_type?: string | null
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_admin_id: string | null
          created_at: string | null
          id: string
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_shows: {
        Row: {
          backdrop_path: string | null
          created_at: string | null
          custom_backdrop: string | null
          custom_name: string | null
          custom_overview: string | null
          custom_player: string | null
          custom_poster: string | null
          first_air_date: string | null
          genre_ids: number[] | null
          id: string
          id_tmdb: number
          metadata: Json | null
          name: string
          overview: string | null
          popularity: number | null
          poster_path: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
          updated_by: string | null
          visibility: boolean | null
          vote_average: number | null
          vote_count: number | null
        }
        Insert: {
          backdrop_path?: string | null
          created_at?: string | null
          custom_backdrop?: string | null
          custom_name?: string | null
          custom_overview?: string | null
          custom_player?: string | null
          custom_poster?: string | null
          first_air_date?: string | null
          genre_ids?: number[] | null
          id?: string
          id_tmdb: number
          metadata?: Json | null
          name: string
          overview?: string | null
          popularity?: number | null
          poster_path?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: boolean | null
          vote_average?: number | null
          vote_count?: number | null
        }
        Update: {
          backdrop_path?: string | null
          created_at?: string | null
          custom_backdrop?: string | null
          custom_name?: string | null
          custom_overview?: string | null
          custom_player?: string | null
          custom_poster?: string | null
          first_air_date?: string | null
          genre_ids?: number[] | null
          id?: string
          id_tmdb?: number
          metadata?: Json | null
          name?: string
          overview?: string | null
          popularity?: number | null
          poster_path?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: boolean | null
          vote_average?: number | null
          vote_count?: number | null
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
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_admin: boolean | null
          is_online: boolean | null
          last_seen: string | null
          user_code: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_admin?: boolean | null
          is_online?: boolean | null
          last_seen?: string | null
          user_code: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_admin?: boolean | null
          is_online?: boolean | null
          last_seen?: string | null
          user_code?: string
          username?: string
        }
        Relationships: []
      }
      views: {
        Row: {
          episode_number: number | null
          id: string
          media_type: string
          season_number: number | null
          tmdb_id: number
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          episode_number?: number | null
          id?: string
          media_type: string
          season_number?: number | null
          tmdb_id: number
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          episode_number?: number | null
          id?: string
          media_type?: string
          season_number?: number | null
          tmdb_id?: number
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string | null
          id: string
          media_type: string
          tmdb_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_type: string
          tmdb_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          media_type?: string
          tmdb_id?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_favorite: {
        Args: { p_media_id: string; p_media_type: string; p_user_id: string }
        Returns: undefined
      }
      add_to_watchlist: {
        Args: { p_media_id: string; p_media_type: string; p_user_id: string }
        Returns: undefined
      }
      generate_admin_code: { Args: never; Returns: string }
      generate_friend_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
