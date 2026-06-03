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
      arbetsklader_utrustning: {
        Row: {
          barcode: string | null
          category: string
          condition: string | null
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          location_id: string | null
          location_name: string | null
          manufacturer: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          quantity: number | null
          size: string | null
          status: string
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category: string
          condition?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          location_id?: string | null
          location_name?: string | null
          manufacturer?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          size?: string | null
          status?: string
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string
          condition?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          location_id?: string | null
          location_name?: string | null
          manufacturer?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          size?: string | null
          status?: string
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arbetsklader_utrustning_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          entity_type: string
          id: string
          name: string
          page_label: string | null
          subcategories: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          id?: string
          name: string
          page_label?: string | null
          subcategories?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          id?: string
          name?: string
          page_label?: string | null
          subcategories?: Json
          updated_at?: string
        }
        Relationships: []
      }
      category_images: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      checkout_reports: {
        Row: {
          checked_out_date: string
          checked_out_items: Json
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          project: string
          recipient_first_name: string
          recipient_last_name: string
          updated_at: string
        }
        Insert: {
          checked_out_date?: string
          checked_out_items?: Json
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          project: string
          recipient_first_name: string
          recipient_last_name: string
          updated_at?: string
        }
        Update: {
          checked_out_date?: string
          checked_out_items?: Json
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          project?: string
          recipient_first_name?: string
          recipient_last_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      depreciation_settings: {
        Row: {
          annual_percentage: number
          created_at: string
          id: string
          level_name: string
          minimum_value_percentage: number
          updated_at: string
        }
        Insert: {
          annual_percentage: number
          created_at?: string
          id?: string
          level_name: string
          minimum_value_percentage: number
          updated_at?: string
        }
        Update: {
          annual_percentage?: number
          created_at?: string
          id?: string
          level_name?: string
          minimum_value_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      global_app_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      hand_tools: {
        Row: {
          assigned_to_email: string | null
          assigned_to_name: string | null
          barcode: string | null
          category: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          location_id: string | null
          location_name: string | null
          manufacturer: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          status: string
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          assigned_to_email?: string | null
          assigned_to_name?: string | null
          barcode?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          location_id?: string | null
          location_name?: string | null
          manufacturer?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          status?: string
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to_email?: string | null
          assigned_to_name?: string | null
          barcode?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          location_id?: string | null
          location_name?: string | null
          manufacturer?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          status?: string
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hand_tools_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      huvudmaskiner: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          location_name: string | null
          manufacturer: string | null
          model: string | null
          name: string
          notes: string | null
          project_number: string | null
          registration_number: string | null
          typ: string | null
          updated_at: string
          year_model: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          location_name?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          notes?: string | null
          project_number?: string | null
          registration_number?: string | null
          typ?: string | null
          updated_at?: string
          year_model?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          location_name?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          project_number?: string | null
          registration_number?: string | null
          typ?: string | null
          updated_at?: string
          year_model?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "huvudmaskiner_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventering_skanningar: {
        Row: {
          anteckningar: string | null
          artikel_id: string | null
          artikel_namn: string
          created_at: string
          id: string
          inventering_id: string | null
          registrerad_tid: string
          scannad_antal: number
          scannad_av_email: string | null
          scannad_av_namn: string | null
          streckkod: string
        }
        Insert: {
          anteckningar?: string | null
          artikel_id?: string | null
          artikel_namn: string
          created_at?: string
          id?: string
          inventering_id?: string | null
          registrerad_tid?: string
          scannad_antal: number
          scannad_av_email?: string | null
          scannad_av_namn?: string | null
          streckkod: string
        }
        Update: {
          anteckningar?: string | null
          artikel_id?: string | null
          artikel_namn?: string
          created_at?: string
          id?: string
          inventering_id?: string | null
          registrerad_tid?: string
          scannad_antal?: number
          scannad_av_email?: string | null
          scannad_av_namn?: string | null
          streckkod?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventering_skanningar_inventering_id_fkey"
            columns: ["inventering_id"]
            isOneToOne: false
            referencedRelation: "inventeringar"
            referencedColumns: ["id"]
          },
        ]
      }
      inventeringar: {
        Row: {
          anteckningar: string | null
          created_at: string
          datum: string
          id: string
          personal_id: string | null
          personal_namn: string
          scanningar: Json
          status: string
          updated_at: string
        }
        Insert: {
          anteckningar?: string | null
          created_at?: string
          datum: string
          id?: string
          personal_id?: string | null
          personal_namn: string
          scanningar?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          anteckningar?: string | null
          created_at?: string
          datum?: string
          id?: string
          personal_id?: string | null
          personal_namn?: string
          scanningar?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_reports: {
        Row: {
          checked_items: number
          checked_list: Json
          created_at: string
          id: string
          location_id: string | null
          location_name: string | null
          mode: string | null
          performed_at: string
          performed_by_email: string | null
          performed_by_name: string | null
          tool_type: string | null
          total_items: number
          unchecked_items: number
          unchecked_list: Json
          updated_at: string
        }
        Insert: {
          checked_items?: number
          checked_list?: Json
          created_at?: string
          id?: string
          location_id?: string | null
          location_name?: string | null
          mode?: string | null
          performed_at: string
          performed_by_email?: string | null
          performed_by_name?: string | null
          tool_type?: string | null
          total_items?: number
          unchecked_items?: number
          unchecked_list?: Json
          updated_at?: string
        }
        Update: {
          checked_items?: number
          checked_list?: Json
          created_at?: string
          id?: string
          location_id?: string | null
          location_name?: string | null
          mode?: string | null
          performed_at?: string
          performed_by_email?: string | null
          performed_by_name?: string | null
          tool_type?: string | null
          total_items?: number
          unchecked_items?: number
          unchecked_list?: Json
          updated_at?: string
        }
        Relationships: []
      }
      inventory_sessions: {
        Row: {
          checked_item_ids: Json
          created_at: string
          id: string
          location_id: string | null
          location_name: string | null
          manual_counts: Json
          mode: string
          paused_at: string | null
          started_at: string
          started_by_email: string | null
          started_by_name: string | null
          status: string
          tool_type: string
          updated_at: string
        }
        Insert: {
          checked_item_ids?: Json
          created_at?: string
          id?: string
          location_id?: string | null
          location_name?: string | null
          manual_counts?: Json
          mode: string
          paused_at?: string | null
          started_at?: string
          started_by_email?: string | null
          started_by_name?: string | null
          status?: string
          tool_type: string
          updated_at?: string
        }
        Update: {
          checked_item_ids?: Json
          created_at?: string
          id?: string
          location_id?: string | null
          location_name?: string | null
          manual_counts?: Json
          mode?: string
          paused_at?: string | null
          started_at?: string
          started_by_email?: string | null
          started_by_name?: string | null
          status?: string
          tool_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      kunder: {
        Row: {
          created_at: string
          id: string
          namn: string
          projektnummer: string | null
          status: string
          typ: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          namn: string
          projektnummer?: string | null
          status?: string
          typ: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          namn?: string
          projektnummer?: string | null
          status?: string
          typ?: string
          updated_at?: string
        }
        Relationships: []
      }
      loan_requests: {
        Row: {
          approved_by_email: string | null
          borrower_email: string | null
          borrower_name: string | null
          created_at: string
          end_date: string | null
          from_location_id: string | null
          from_location_name: string | null
          id: string
          metadata: Json
          notes: string | null
          start_date: string | null
          status: string
          to_location_id: string | null
          to_location_name: string | null
          tool_id: string | null
          tool_name: string | null
          tool_type: string | null
          updated_at: string
        }
        Insert: {
          approved_by_email?: string | null
          borrower_email?: string | null
          borrower_name?: string | null
          created_at?: string
          end_date?: string | null
          from_location_id?: string | null
          from_location_name?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          start_date?: string | null
          status?: string
          to_location_id?: string | null
          to_location_name?: string | null
          tool_id?: string | null
          tool_name?: string | null
          tool_type?: string | null
          updated_at?: string
        }
        Update: {
          approved_by_email?: string | null
          borrower_email?: string | null
          borrower_name?: string | null
          created_at?: string
          end_date?: string | null
          from_location_id?: string | null
          from_location_name?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          start_date?: string | null
          status?: string
          to_location_id?: string | null
          to_location_name?: string | null
          tool_id?: string | null
          tool_name?: string | null
          tool_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_deleted: boolean
          name: string
          notes: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          notes?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          notes?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lokalvard_artikel_requests: {
        Row: {
          antal: number
          approved_at: string | null
          approved_by_email: string | null
          artikel_id: string | null
          artikel_namn: string | null
          created_at: string
          id: string
          kund_id: string | null
          kund_namn: string | null
          metadata: Json
          notes: string | null
          projektnummer: string | null
          requester_email: string | null
          requester_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          antal?: number
          approved_at?: string | null
          approved_by_email?: string | null
          artikel_id?: string | null
          artikel_namn?: string | null
          created_at?: string
          id?: string
          kund_id?: string | null
          kund_namn?: string | null
          metadata?: Json
          notes?: string | null
          projektnummer?: string | null
          requester_email?: string | null
          requester_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          antal?: number
          approved_at?: string | null
          approved_by_email?: string | null
          artikel_id?: string | null
          artikel_namn?: string | null
          created_at?: string
          id?: string
          kund_id?: string | null
          kund_namn?: string | null
          metadata?: Json
          notes?: string | null
          projektnummer?: string | null
          requester_email?: string | null
          requester_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lokalvard_artikel_requests_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "lokalvards_artiklar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lokalvard_artikel_requests_kund_id_fkey"
            columns: ["kund_id"]
            isOneToOne: false
            referencedRelation: "kunder"
            referencedColumns: ["id"]
          },
        ]
      }
      lokalvard_checkouts: {
        Row: {
          antal: number
          artikel_id: string | null
          artikel_namn: string | null
          created_at: string
          datum: string
          id: string
          kund_id: string | null
          kund_namn: string | null
          metadata: Json
          notes: string | null
          projektnummer: string | null
          updated_at: string
          utfort_av_email: string | null
          utfort_av_namn: string | null
        }
        Insert: {
          antal?: number
          artikel_id?: string | null
          artikel_namn?: string | null
          created_at?: string
          datum?: string
          id?: string
          kund_id?: string | null
          kund_namn?: string | null
          metadata?: Json
          notes?: string | null
          projektnummer?: string | null
          updated_at?: string
          utfort_av_email?: string | null
          utfort_av_namn?: string | null
        }
        Update: {
          antal?: number
          artikel_id?: string | null
          artikel_namn?: string | null
          created_at?: string
          datum?: string
          id?: string
          kund_id?: string | null
          kund_namn?: string | null
          metadata?: Json
          notes?: string | null
          projektnummer?: string | null
          updated_at?: string
          utfort_av_email?: string | null
          utfort_av_namn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lokalvard_checkouts_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "lokalvards_artiklar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lokalvard_checkouts_kund_id_fkey"
            columns: ["kund_id"]
            isOneToOne: false
            referencedRelation: "kunder"
            referencedColumns: ["id"]
          },
        ]
      }
      lokalvard_inkop: {
        Row: {
          antal: number
          artikel_id: string | null
          artikel_namn: string | null
          created_at: string
          datum: string
          id: string
          leverantor: string | null
          metadata: Json
          notes: string | null
          pris: number | null
          updated_at: string
        }
        Insert: {
          antal?: number
          artikel_id?: string | null
          artikel_namn?: string | null
          created_at?: string
          datum: string
          id?: string
          leverantor?: string | null
          metadata?: Json
          notes?: string | null
          pris?: number | null
          updated_at?: string
        }
        Update: {
          antal?: number
          artikel_id?: string | null
          artikel_namn?: string | null
          created_at?: string
          datum?: string
          id?: string
          leverantor?: string | null
          metadata?: Json
          notes?: string | null
          pris?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lokalvard_inkop_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "lokalvards_artiklar"
            referencedColumns: ["id"]
          },
        ]
      }
      lokalvards_artiklar: {
        Row: {
          artikelnummer: string | null
          beskrivning: string | null
          created_at: string
          deleted_at: string | null
          enhet: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          kategori: string | null
          lagersaldo: number | null
          leverantor: string | null
          metadata: Json
          minimum_lagersaldo: number | null
          namn: string
          pris_per_enhet: number | null
          streckkod: string | null
          underkategori: string | null
          updated_at: string
        }
        Insert: {
          artikelnummer?: string | null
          beskrivning?: string | null
          created_at?: string
          deleted_at?: string | null
          enhet?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          kategori?: string | null
          lagersaldo?: number | null
          leverantor?: string | null
          metadata?: Json
          minimum_lagersaldo?: number | null
          namn: string
          pris_per_enhet?: number | null
          streckkod?: string | null
          underkategori?: string | null
          updated_at?: string
        }
        Update: {
          artikelnummer?: string | null
          beskrivning?: string | null
          created_at?: string
          deleted_at?: string | null
          enhet?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          kategori?: string | null
          lagersaldo?: number | null
          leverantor?: string | null
          metadata?: Json
          minimum_lagersaldo?: number | null
          namn?: string
          pris_per_enhet?: number | null
          streckkod?: string | null
          underkategori?: string | null
          updated_at?: string
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
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          permission: string
          resource: string
          role: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission: string
          resource: string
          role: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission?: string
          resource?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_records: {
        Row: {
          attachments: Json
          cost: number | null
          created_at: string
          hours_at_service: number | null
          id: string
          next_service_date: string | null
          notes: string | null
          performed_by_email: string | null
          performed_by_name: string | null
          service_date: string
          service_type: string | null
          tool_id: string | null
          tool_name: string | null
          tool_type: string | null
          updated_at: string
        }
        Insert: {
          attachments?: Json
          cost?: number | null
          created_at?: string
          hours_at_service?: number | null
          id?: string
          next_service_date?: string | null
          notes?: string | null
          performed_by_email?: string | null
          performed_by_name?: string | null
          service_date: string
          service_type?: string | null
          tool_id?: string | null
          tool_name?: string | null
          tool_type?: string | null
          updated_at?: string
        }
        Update: {
          attachments?: Json
          cost?: number | null
          created_at?: string
          hours_at_service?: number | null
          id?: string
          next_service_date?: string | null
          notes?: string | null
          performed_by_email?: string | null
          performed_by_name?: string | null
          service_date?: string
          service_type?: string | null
          tool_id?: string | null
          tool_name?: string | null
          tool_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_templates: {
        Row: {
          category: string | null
          checklist: Json
          created_at: string
          description: string | null
          id: string
          interval_hours: number | null
          interval_months: number | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          checklist?: Json
          created_at?: string
          description?: string | null
          id?: string
          interval_hours?: number | null
          interval_months?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          checklist?: Json
          created_at?: string
          description?: string | null
          id?: string
          interval_hours?: number | null
          interval_months?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      spreadsheet_cells: {
        Row: {
          col_index: number
          created_at: string
          id: string
          metadata: Json
          row_index: number
          sheet_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          col_index: number
          created_at?: string
          id?: string
          metadata?: Json
          row_index: number
          sheet_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          col_index?: number
          created_at?: string
          id?: string
          metadata?: Json
          row_index?: number
          sheet_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_location_id: string | null
          default_location_name: string | null
          email: string | null
          id: string
          is_active: boolean
          location_ids: Json
          location_names: Json
          name: string
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_location_id?: string | null
          default_location_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          location_ids?: Json
          location_names?: Json
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_location_id?: string | null
          default_location_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          location_ids?: Json
          location_names?: Json
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_logs: {
        Row: {
          action: string
          created_at: string
          from_location_id: string | null
          from_location_name: string | null
          id: string
          metadata: Json
          notes: string | null
          performed_by_email: string | null
          performed_by_name: string | null
          to_location_id: string | null
          to_location_name: string | null
          tool_id: string | null
          tool_name: string | null
          tool_type: string | null
        }
        Insert: {
          action: string
          created_at?: string
          from_location_id?: string | null
          from_location_name?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          performed_by_email?: string | null
          performed_by_name?: string | null
          to_location_id?: string | null
          to_location_name?: string | null
          tool_id?: string | null
          tool_name?: string | null
          tool_type?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          from_location_id?: string | null
          from_location_name?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          performed_by_email?: string | null
          performed_by_name?: string | null
          to_location_id?: string | null
          to_location_name?: string | null
          tool_id?: string | null
          tool_name?: string | null
          tool_type?: string | null
        }
        Relationships: []
      }
      tools: {
        Row: {
          assigned_to_email: string | null
          assigned_to_name: string | null
          barcode: string | null
          category: string | null
          condition: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          huvudmaskin_id: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          is_sold: boolean
          location_id: string | null
          location_name: string | null
          manufacturer: string | null
          metadata: Json
          model: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          serial_number: string | null
          sold_date: string | null
          sold_price: number | null
          status: string
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          assigned_to_email?: string | null
          assigned_to_name?: string | null
          barcode?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          huvudmaskin_id?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_sold?: boolean
          location_id?: string | null
          location_name?: string | null
          manufacturer?: string | null
          metadata?: Json
          model?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          sold_date?: string | null
          sold_price?: number | null
          status?: string
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to_email?: string | null
          assigned_to_name?: string | null
          barcode?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          huvudmaskin_id?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_sold?: boolean
          location_id?: string | null
          location_name?: string | null
          manufacturer?: string | null
          metadata?: Json
          model?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          sold_date?: string | null
          sold_price?: number | null
          status?: string
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tools_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          approved_by_email: string | null
          created_at: string
          from_location_id: string | null
          from_location_name: string | null
          id: string
          metadata: Json
          notes: string | null
          requested_by_email: string | null
          requested_by_name: string | null
          status: string
          to_location_id: string | null
          to_location_name: string | null
          tool_id: string | null
          tool_name: string | null
          tool_type: string | null
          updated_at: string
        }
        Insert: {
          approved_by_email?: string | null
          created_at?: string
          from_location_id?: string | null
          from_location_name?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          requested_by_email?: string | null
          requested_by_name?: string | null
          status?: string
          to_location_id?: string | null
          to_location_name?: string | null
          tool_id?: string | null
          tool_name?: string | null
          tool_type?: string | null
          updated_at?: string
        }
        Update: {
          approved_by_email?: string | null
          created_at?: string
          from_location_id?: string | null
          from_location_name?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          requested_by_email?: string | null
          requested_by_name?: string | null
          status?: string
          to_location_id?: string | null
          to_location_name?: string | null
          tool_id?: string | null
          tool_name?: string | null
          tool_type?: string | null
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
      uttag: {
        Row: {
          created_at: string
          datum: string
          id: string
          items: Json
          kund_id: string | null
          kund_namn: string | null
          metadata: Json
          notes: string | null
          projektnummer: string | null
          total_pris: number | null
          updated_at: string
          utfort_av_email: string | null
          utfort_av_namn: string | null
        }
        Insert: {
          created_at?: string
          datum: string
          id?: string
          items?: Json
          kund_id?: string | null
          kund_namn?: string | null
          metadata?: Json
          notes?: string | null
          projektnummer?: string | null
          total_pris?: number | null
          updated_at?: string
          utfort_av_email?: string | null
          utfort_av_namn?: string | null
        }
        Update: {
          created_at?: string
          datum?: string
          id?: string
          items?: Json
          kund_id?: string | null
          kund_namn?: string | null
          metadata?: Json
          notes?: string | null
          projektnummer?: string | null
          total_pris?: number | null
          updated_at?: string
          utfort_av_email?: string | null
          utfort_av_namn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uttag_kund_id_fkey"
            columns: ["kund_id"]
            isOneToOne: false
            referencedRelation: "kunder"
            referencedColumns: ["id"]
          },
        ]
      }
      workwear_requests: {
        Row: {
          approved_at: string | null
          approved_by_email: string | null
          created_at: string
          id: string
          items: Json
          notes: string | null
          requester_email: string | null
          requester_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_email?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          requester_email?: string | null
          requester_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_email?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          requester_email?: string | null
          requester_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "technician"
        | "apprentice"
        | "contractor"
        | "admin_lokalvard"
        | "lokalvardare"
        | "verktygsforvaltare"
        | "admin"
        | "agare"
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
      app_role: [
        "technician",
        "apprentice",
        "contractor",
        "admin_lokalvard",
        "lokalvardare",
        "verktygsforvaltare",
        "admin",
        "agare",
      ],
    },
  },
} as const
