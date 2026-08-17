/**
 * Hand-written mirror of `supabase/migrations/*.sql`.
 * Regenerate with `supabase gen types typescript` once the CLI is linked.
 */

export type PlanId = "free" | "pro_monthly" | "pro_yearly" | "lifetime";

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

/** `public.admin_user_plans` — one row per account, RLS-filtered (own row, or all for an admin). */
export interface AdminUserPlanRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  plan: PlanId;
  plan_status: PlanStatus;
  plan_source: PlanSource;
  full_access: boolean;
  current_period_end: string | null;
  cancel_at: string | null;
  has_creem_customer: boolean;
  is_admin: boolean;
  created_at: string;
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
          provider_event_id: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
      };
    };
    Views: {
      admin_user_plans: {
        Row: AdminUserPlanRow;
      };
    };
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
      is_privileged_admin: {
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
      admin_set_plan_by_email: {
        Args: {
          target_email: string;
          new_plan: PlanId;
          months?: number | null;
          note?: string | null;
        };
        Returns: ProfileRow;
      };
      admin_revoke_plan: {
        Args: { target_email: string; note?: string | null };
        Returns: ProfileRow;
      };
      apply_creem_event: {
        Args: {
          p_event_id: string;
          p_event_type: string;
          p_user_id: string;
          p_plan: PlanId;
          p_status: PlanStatus;
          p_period_end?: string | null;
          p_cancel_at?: string | null;
          p_customer_id?: string | null;
          p_subscription_id?: string | null;
          p_payload?: Record<string, unknown>;
          p_allow_lifetime_downgrade?: boolean;
        };
        Returns: ProfileRow;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
