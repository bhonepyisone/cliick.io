// supabase/database.types.ts
// Complete type definitions matching migrations/001_initial_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          updated_at?: string
        }
      }
      shops: {
        Row: {
          id: string
          name: string
          owner_id: string
          logo_url: string | null
          description: string | null
          subscription_plan: string
          subscription_status: Database['public']['Enums']['subscription_status']
          trial_ends_at: string | null
          period_ends_at: string | null
          payment_proof: string | null
          data_extension_status: Database['public']['Enums']['data_extension_status']
          data_extension_subscribed_at: string | null
          data_extension_deletion_scheduled_at: string | null
          data_extension_is_committed: boolean
          ai_credits_description_generator: number
          ai_credits_photo_studio: number
          ai_credits_shop_suggestion: number
          assistant_name: string
          assistant_tone: string
          primary_language: string
          offline_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          logo_url?: string | null
          description?: string | null
          subscription_plan?: string
          subscription_status?: Database['public']['Enums']['subscription_status']
          trial_ends_at?: string | null
          period_ends_at?: string | null
          payment_proof?: string | null
          data_extension_status?: Database['public']['Enums']['data_extension_status']
          data_extension_subscribed_at?: string | null
          data_extension_deletion_scheduled_at?: string | null
          data_extension_is_committed?: boolean
          ai_credits_description_generator?: number
          ai_credits_photo_studio?: number
          ai_credits_shop_suggestion?: number
          assistant_name?: string
          assistant_tone?: string
          primary_language?: string
          offline_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          logo_url?: string | null
          description?: string | null
          subscription_plan?: string
          subscription_status?: Database['public']['Enums']['subscription_status']
          trial_ends_at?: string | null
          period_ends_at?: string | null
          payment_proof?: string | null
          data_extension_status?: Database['public']['Enums']['data_extension_status']
          data_extension_subscribed_at?: string | null
          data_extension_deletion_scheduled_at?: string | null
          data_extension_is_committed?: boolean
          ai_credits_description_generator?: number
          ai_credits_photo_studio?: number
          ai_credits_shop_suggestion?: number
          assistant_name?: string
          assistant_tone?: string
          primary_language?: string
          offline_message?: string | null
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          shop_id: string
          user_id: string
          role: Database['public']['Enums']['team_role']
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          user_id: string
          role?: Database['public']['Enums']['team_role']
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          user_id?: string
          role?: Database['public']['Enums']['team_role']
        }
      }
      items: {
        Row: {
          id: string
          shop_id: string
          item_type: Database['public']['Enums']['item_type']
          name: string
          description: string | null
          facebook_subtitle: string | null
          retail_price: number
          original_price: number | null
          promo_price: number | null
          promo_start_date: string | null
          promo_end_date: string | null
          stock: number
          category: string | null
          image_url: string | null
          warranty: string | null
          duration: number | null
          location: string | null
          form_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          item_type?: Database['public']['Enums']['item_type']
          name: string
          description?: string | null
          facebook_subtitle?: string | null
          retail_price?: number
          original_price?: number | null
          promo_price?: number | null
          promo_start_date?: string | null
          promo_end_date?: string | null
          stock?: number
          category?: string | null
          image_url?: string | null
          warranty?: string | null
          duration?: number | null
          location?: string | null
          form_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          item_type?: Database['public']['Enums']['item_type']
          name?: string
          description?: string | null
          facebook_subtitle?: string | null
          retail_price?: number
          original_price?: number | null
          promo_price?: number | null
          promo_start_date?: string | null
          promo_end_date?: string | null
          stock?: number
          category?: string | null
          image_url?: string | null
          warranty?: string | null
          duration?: number | null
          location?: string | null
          form_id?: string | null
          updated_at?: string
        }
      }
      stock_history: {
        Row: {
          id: string
          item_id: string
          shop_id: string
          change: number
          new_stock: number
          reason: string
          changed_by: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          item_id: string
          shop_id: string
          change: number
          new_stock: number
          reason: string
          changed_by?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          item_id?: string
          shop_id?: string
          change?: number
          new_stock?: number
          reason?: string
          changed_by?: string | null
          timestamp?: string
        }
      }
      forms: {
        Row: {
          id: string
          shop_id: string
          name: string
          fields: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          fields?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          name?: string
          fields?: Json
          updated_at?: string
        }
      }
      form_submissions: {
        Row: {
          id: string
          submission_id: string
          shop_id: string
          form_id: string
          form_name: string
          status: Database['public']['Enums']['order_status']
          ordered_products: Json
          payment_method: string | null
          payment_screenshot_url: string | null
          discount: Json | null
          custom_fields: Json
          submitted_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          shop_id: string
          form_id: string
          form_name: string
          status?: Database['public']['Enums']['order_status']
          ordered_products?: Json
          payment_method?: string | null
          payment_screenshot_url?: string | null
          discount?: Json | null
          custom_fields?: Json
          submitted_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          shop_id?: string
          form_id?: string
          form_name?: string
          status?: Database['public']['Enums']['order_status']
          ordered_products?: Json
          payment_method?: string | null
          payment_screenshot_url?: string | null
          discount?: Json | null
          custom_fields?: Json
          submitted_at?: string
          updated_at?: string
        }
      }
      payment_methods: {
        Row: {
          id: string
          shop_id: string
          name: string
          instructions: string
          qr_code_url: string | null
          requires_proof: boolean
          enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          instructions: string
          qr_code_url?: string | null
          requires_proof?: boolean
          enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          name?: string
          instructions?: string
          qr_code_url?: string | null
          requires_proof?: boolean
          enabled?: boolean
        }
      }
      conversations: {
        Row: {
          id: string
          shop_id: string
          customer_id: string
          customer_name: string | null
          platform: string
          is_live: boolean
          is_archived: boolean
          last_message_at: string
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          customer_id: string
          customer_name?: string | null
          platform: string
          is_live?: boolean
          is_archived?: boolean
          last_message_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          customer_id?: string
          customer_name?: string | null
          platform?: string
          is_live?: boolean
          is_archived?: boolean
          last_message_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender: Database['public']['Enums']['message_sender']
          text: string | null
          attachment: Json | null
          quick_replies: Json | null
          carousel: Json | null
          persistent_buttons: Json | null
          timestamp: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender: Database['public']['Enums']['message_sender']
          text?: string | null
          attachment?: Json | null
          quick_replies?: Json | null
          carousel?: Json | null
          persistent_buttons?: Json | null
          timestamp?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender?: Database['public']['Enums']['message_sender']
          text?: string | null
          attachment?: Json | null
          quick_replies?: Json | null
          carousel?: Json | null
          persistent_buttons?: Json | null
          timestamp?: string
        }
      }
      keyword_replies: {
        Row: {
          id: string
          shop_id: string
          keywords: string
          reply: string
          match_type: string
          apply_to_chat: boolean
          apply_to_comments: boolean
          attachment: Json | null
          buttons: Json
          enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          keywords: string
          reply: string
          match_type?: string
          apply_to_chat?: boolean
          apply_to_comments?: boolean
          attachment?: Json | null
          buttons?: Json
          enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          keywords?: string
          reply?: string
          match_type?: string
          apply_to_chat?: boolean
          apply_to_comments?: boolean
          attachment?: Json | null
          buttons?: Json
          enabled?: boolean
        }
      }
      saved_replies: {
        Row: {
          id: string
          shop_id: string
          title: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          title: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          title?: string
          content?: string
        }
      }
      daily_sales_metrics: {
        Row: {
          id: string
          shop_id: string
          date: string
          revenue: number
          net_profit: number
          orders_count: number
          items_sold: number
          avg_order_value: number
          pending_count: number
          confirmed_count: number
          completed_count: number
          cancelled_count: number
          return_count: number
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          date: string
          revenue?: number
          net_profit?: number
          orders_count?: number
          items_sold?: number
          avg_order_value?: number
          pending_count?: number
          confirmed_count?: number
          completed_count?: number
          cancelled_count?: number
          return_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          date?: string
          revenue?: number
          net_profit?: number
          orders_count?: number
          items_sold?: number
          avg_order_value?: number
          pending_count?: number
          confirmed_count?: number
          completed_count?: number
          cancelled_count?: number
          return_count?: number
        }
      }
      product_analytics: {
        Row: {
          id: string
          shop_id: string
          item_id: string
          date: string
          units_sold: number
          units_returned: number
          revenue: number
          cost_of_goods: number
          profit: number
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          item_id: string
          date: string
          units_sold?: number
          units_returned?: number
          revenue?: number
          cost_of_goods?: number
          profit?: number
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          item_id?: string
          date?: string
          units_sold?: number
          units_returned?: number
          revenue?: number
          cost_of_goods?: number
          profit?: number
        }
      }
      platform_metrics: {
        Row: {
          id: string
          date: string
          mrr: number
          platform_gmv: number
          new_users: number
          new_subscriptions: number
          active_shops: number
          total_shops: number
          total_orders: number
          total_conversations: number
          ai_messages_processed: number
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          mrr?: number
          platform_gmv?: number
          new_users?: number
          new_subscriptions?: number
          active_shops?: number
          total_shops?: number
          total_orders?: number
          total_conversations?: number
          ai_messages_processed?: number
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          mrr?: number
          platform_gmv?: number
          new_users?: number
          new_subscriptions?: number
          active_shops?: number
          total_shops?: number
          total_orders?: number
          total_conversations?: number
          ai_messages_processed?: number
        }
      }
      backup_logs: {
        Row: {
          id: string
          backup_type: string
          status: string
          storage_location: string | null
          file_size_bytes: number | null
          tables_included: string[] | null
          rows_backed_up: number | null
          started_at: string
          completed_at: string | null
          error_message: string | null
        }
        Insert: {
          id?: string
          backup_type: string
          status: string
          storage_location?: string | null
          file_size_bytes?: number | null
          tables_included?: string[] | null
          rows_backed_up?: number | null
          started_at?: string
          completed_at?: string | null
          error_message?: string | null
        }
        Update: {
          id?: string
          backup_type?: string
          status?: string
          storage_location?: string | null
          file_size_bytes?: number | null
          tables_included?: string[] | null
          rows_backed_up?: number | null
          started_at?: string
          completed_at?: string | null
          error_message?: string | null
        }
      }
      recovery_snapshots: {
        Row: {
          id: string
          snapshot_name: string
          description: string | null
          shop_ids: string[] | null
          backup_log_id: string | null
          can_restore_to_timestamp: string
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          snapshot_name: string
          description?: string | null
          shop_ids?: string[] | null
          backup_log_id?: string | null
          can_restore_to_timestamp: string
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          snapshot_name?: string
          description?: string | null
          shop_ids?: string[] | null
          backup_log_id?: string | null
          can_restore_to_timestamp?: string
          expires_at?: string | null
        }
      }
      sync_status: {
        Row: {
          id: string
          shop_id: string
          table_name: string
          last_synced_at: string | null
          sync_version: number
          has_conflicts: boolean
          conflict_details: Json | null
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          table_name: string
          last_synced_at?: string | null
          sync_version?: number
          has_conflicts?: boolean
          conflict_details?: Json | null
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          table_name?: string
          last_synced_at?: string | null
          sync_version?: number
          has_conflicts?: boolean
          conflict_details?: Json | null
          updated_at?: string
        }
      }
      social_integrations: {
        Row: {
          id: string
          shop_id: string
          platform: string
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          platform_user_id: string | null
          platform_page_id: string | null
          is_connected: boolean
          last_sync_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          platform: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          platform_user_id?: string | null
          platform_page_id?: string | null
          is_connected?: boolean
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          platform?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          platform_user_id?: string | null
          platform_page_id?: string | null
          is_connected?: boolean
          last_sync_at?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_stock: {
        Args: {
          p_item_id: string
          p_change: number
          p_reason: string
          p_changed_by?: string | null
        }
        Returns: Json
      }
      process_order_stock_changes: {
        Args: {
          p_order_items: Json
          p_order_id: string
          p_shop_id: string
        }
        Returns: Json
      }
      get_low_stock_items: {
        Args: {
          p_shop_id: string
          p_threshold?: number
        }
        Returns: {
          id: string
          name: string
          stock: number
          category: string | null
          last_sale_date: string | null
        }[]
      }
      generate_daily_sales_metrics: {
        Args: {
          p_shop_id: string
          p_date: string
        }
        Returns: void
      }
      generate_product_analytics: {
        Args: {
          p_shop_id: string
          p_date: string
        }
        Returns: void
      }
      get_sales_metrics: {
        Args: {
          p_shop_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          date: string
          revenue: number
          net_profit: number
          orders_count: number
          items_sold: number
          avg_order_value: number
        }[]
      }
      generate_platform_metrics: {
        Args: {
          p_date: string
        }
        Returns: void
      }
      create_backup_snapshot: {
        Args: {
          p_snapshot_name: string
          p_description?: string | null
          p_shop_ids?: string[] | null
        }
        Returns: string
      }
      cleanup_expired_snapshots: {
        Args: {}
        Returns: number
      }
      get_shop_stats: {
        Args: {
          p_shop_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      subscription_status: 'trialing' | 'active' | 'expired' | 'pending_approval'
      data_extension_status: 'inactive' | 'pending_activation' | 'active' | 'pending_deletion' | 'deletion_applied' | 'pending_cancellation' | 'pending_approval'
      team_role: 'Owner' | 'Admin' | 'Order Manager' | 'Support Agent'
      item_type: 'product' | 'service'
      form_field_type: 'Short Text' | 'Text Area' | 'Number' | 'Email' | 'Phone' | 'Date' | 'Dropdown' | 'Multiple Choice' | 'Checkbox' | 'Item Selector' | 'Payment Selector'
      order_status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Return'
      message_sender: 'user' | 'bot'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
