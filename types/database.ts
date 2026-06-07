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
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          plan: 'free' | 'pro' | 'enterprise'
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          plan?: 'free' | 'pro' | 'enterprise'
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
        Relationships: any[]
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string | null
          role: 'admin_catering' | 'cliente_final'
          full_name: string | null
          email: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id?: string | null
          role?: 'admin_catering' | 'cliente_final'
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: any[]
      }
      menus: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          price_per_person: number
          min_guests: number
          max_guests: number
          cover_url: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          price_per_person?: number
          min_guests?: number
          max_guests?: number
          cover_url?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['menus']['Insert']>
        Relationships: any[]
      }
      menu_items: {
        Row: {
          id: string
          menu_id: string
          tenant_id: string
          name: string
          description: string | null
          category: 'entrante' | 'principal' | 'postre' | 'bebida' | 'extra'
          allergens: string[]
          photo_url: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          menu_id: string
          tenant_id: string
          name: string
          description?: string | null
          category?: 'entrante' | 'principal' | 'postre' | 'bebida' | 'extra'
          allergens?: string[]
          photo_url?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['menu_items']['Insert']>
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          }
        ]
      }
      events: {
        Row: {
          id: string
          tenant_id: string
          name: string
          date: string
          start_time: string | null
          end_time: string | null
          location: string | null
          max_guests: number | null
          status: 'available' | 'reserved' | 'cancelled' | 'completed'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          date: string
          start_time?: string | null
          end_time?: string | null
          location?: string | null
          max_guests?: number | null
          status?: 'available' | 'reserved' | 'cancelled' | 'completed'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
        Relationships: any[]
      }
      bookings: {
        Row: {
          id: string
          tenant_id: string
          event_id: string | null
          menu_id: string
          client_name: string
          client_email: string
          client_phone: string | null
          client_profile_id: string | null
          guests: number
          extras: Json
          total_amount: number
          deposit_amount: number
          client_allergens: string[]
          notes: string | null
          status: 'pending' | 'confirmed' | 'cancelled' | 'paid_full'
          event_date: string | null
          event_time: string | null
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          event_id?: string | null
          menu_id: string
          client_name: string
          client_email: string
          client_phone?: string | null
          client_profile_id?: string | null
          guests?: number
          extras?: Json
          total_amount?: number
          deposit_amount?: number
          client_allergens?: string[]
          notes?: string | null
          status?: 'pending' | 'confirmed' | 'cancelled' | 'paid_full'
          event_date?: string | null
          event_time?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
        Relationships: [
           {
             foreignKeyName: "bookings_menu_id_fkey"
             columns: ["menu_id"]
             isOneToOne: false
             referencedRelation: "menus"
             referencedColumns: ["id"]
           }
        ]
      }
      payments: {
        Row: {
          id: string
          tenant_id: string
          booking_id: string
          stripe_session_id: string | null
          stripe_payment_intent_id: string | null
          amount: number
          currency: string
          payment_type: 'deposit' | 'final'
          status: 'pending' | 'completed' | 'refunded' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          booking_id: string
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          amount?: number
          currency?: string
          payment_type: 'deposit' | 'final'
          status?: 'pending' | 'completed' | 'refunded' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
        Relationships: any[]
      }
    }
      ingredients: {
        Row: {
          id: string
          tenant_id: string
          name: string
          unit: 'kg' | 'l' | 'g' | 'ml' | 'unit'
          cost_per_unit: number
          waste_percentage: number
          supplier: string | null
          notes: string | null
          created_at: string
          updated_at: string
          stock_quantity: number
          stock_min: number
          stock_location: string | null
          stock_is_low: boolean
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          unit: 'kg' | 'l' | 'g' | 'ml' | 'unit'
          cost_per_unit?: number
          waste_percentage?: number
          supplier?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          stock_quantity?: number
          stock_min?: number
          stock_location?: string | null
        }
        Update: Partial<Database['public']['Tables']['ingredients']['Insert']>
        Relationships: any[]
      }
      suppliers: {
        Row: {
          id: string
          tenant_id: string
          name: string
          email: string | null
          phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          email?: string | null
          phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>
        Relationships: any[]
      }
      purchase_orders: {
        Row: {
          id: string
          tenant_id: string
          supplier_id: string
          status: 'borrador' | 'enviado' | 'recibido' | 'cancelado'
          notes: string | null
          sent_at: string | null
          received_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          supplier_id: string
          status?: 'borrador' | 'enviado' | 'recibido' | 'cancelado'
          notes?: string | null
          sent_at?: string | null
          received_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['purchase_orders']['Insert']>
        Relationships: any[]
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          ingredient_id: string
          quantity_ordered: number
          quantity_received: number | null
          unit: string
          unit_price: number | null
          notes: string | null
        }
        Insert: {
          id?: string
          purchase_order_id: string
          ingredient_id: string
          quantity_ordered: number
          quantity_received?: number | null
          unit: string
          unit_price?: number | null
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['purchase_order_items']['Insert']>
        Relationships: any[]
      }
      stock_movements: {
        Row: {
          id: string
          tenant_id: string
          ingredient_id: string
          type: 'entrada' | 'salida' | 'ajuste'
          quantity: number
          reason: string | null
          event_id: string | null
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          ingredient_id: string
          type: 'entrada' | 'salida' | 'ajuste'
          quantity: number
          reason?: string | null
          event_id?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['stock_movements']['Insert']>
        Relationships: any[]
      }
      ingredient_price_history: {
        Row: {
          id: string
          ingredient_id: string
          cost_per_unit: number
          recorded_at: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          cost_per_unit: number
          recorded_at?: string
        }
        Update: Partial<Database['public']['Tables']['ingredient_price_history']['Insert']>
        Relationships: any[]
      }
      recipes: {
        Row: {
          id: string
          tenant_id: string
          name: string
          category: 'entrante' | 'primer' | 'segundo' | 'postre' | 'bebida' | 'extra' | null
          servings: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          category?: 'entrante' | 'primer' | 'segundo' | 'postre' | 'bebida' | 'extra' | null
          servings?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['recipes']['Insert']>
        Relationships: any[]
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          ingredient_id: string
          quantity: number
          unit: string
        }
        Insert: {
          id?: string
          recipe_id: string
          ingredient_id: string
          quantity: number
          unit: string
        }
        Update: Partial<Database['public']['Tables']['recipe_ingredients']['Insert']>
        Relationships: any[]
      }
      recipe_sub_recipes: {
        Row: {
          id: string
          parent_recipe_id: string
          child_recipe_id: string
          quantity: number
        }
        Insert: {
          id?: string
          parent_recipe_id: string
          child_recipe_id: string
          quantity: number
        }
        Update: Partial<Database['public']['Tables']['recipe_sub_recipes']['Insert']>
        Relationships: any[]
      }
      menu_recipes: {
        Row: {
          id: string
          menu_id: string
          recipe_id: string
          portions_per_person: number
        }
        Insert: {
          id?: string
          menu_id: string
          recipe_id: string
          portions_per_person?: number
        }
        Update: Partial<Database['public']['Tables']['menu_recipes']['Insert']>
        Relationships: any[]
      }
    }
    Views: Record<string, never>
    Functions: {
      my_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: Record<string, never>
  }
}

// Convenience types
export type Tenant = Database['public']['Tables']['tenants']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Menu = Database['public']['Tables']['menus']['Row']
export type MenuItem = Database['public']['Tables']['menu_items']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type Ingredient = Database['public']['Tables']['ingredients']['Row']
export type IngredientPriceHistory = Database['public']['Tables']['ingredient_price_history']['Row']
export type Recipe = Database['public']['Tables']['recipes']['Row']
export type RecipeIngredient = Database['public']['Tables']['recipe_ingredients']['Row']
export type RecipeSubRecipe = Database['public']['Tables']['recipe_sub_recipes']['Row']
export type MenuRecipe = Database['public']['Tables']['menu_recipes']['Row']
export type StockMovement = Database['public']['Tables']['stock_movements']['Row']
export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row']
export type PurchaseOrderItem = Database['public']['Tables']['purchase_order_items']['Row']

export type BookingWithMenu = Booking & { menus: Menu }
export type MenuWithItems = Menu & { menu_items: MenuItem[] }
export type RecipeIngredientWithIngredient = RecipeIngredient & { ingredients: Ingredient }
export type RecipeSubRecipeWithChild = RecipeSubRecipe & { recipes: Recipe }
export type MenuRecipeWithRecipe = MenuRecipe & { recipes: Recipe }
