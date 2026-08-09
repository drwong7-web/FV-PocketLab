/**
 * Hand-written mirror of `supabase/migrations/*.sql`.
 * Regenerate with `supabase gen types typescript` once the CLI is linked.
 */

export type PlanId = "free" | "pro_monthly" | "lifetime";

export type PlanStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "expired";

export type PlanSource = "system" | "manual" | "creem";

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  plan: PlanId;
  plan_status: PlanStatus;
  plan_source: PlanSource;
  current_period_end: string | null;
  cancel_at: string | null;
  creem_customer_id: string | null;
  creem_subscription_id: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface EntitlementsRow {
  plan: PlanId;
  plan_status: PlanStatus;
  current_period_end: string | null;
  cancel_at: string | null;
  full_access: boolean;
  ads_enabled: boolean;
  is_admin: boolean;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
      };
      plan_events: {
        Row: {
          id: number;
          user_id: string;
          event_type: string;
          from_plan: string | null;
          to_plan: string | null;
          from_status: string | null;
          to_status: string | null;
          source: string;
          payload: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: {
      my_entitlements: {
        Args: Record<string, never>;
        Returns: EntitlementsRow[];
      };
      has_full_access: {
        Args: { target: string };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      admin_set_plan: {
        Args: {
          target_user: string;
          new_plan: PlanId;
          new_status?: PlanStatus;
          period_end?: string | null;
          note?: string | null;
        };
        Returns: ProfileRow;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
