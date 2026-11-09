export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CrmRole = "owner" | "admin" | "user" | "agent" | "viewer";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: CrmRole;
  title: string | null;
  status: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  lead_code: string;
  owner_id: string;
  date_created: string;
  lead_source: string | null;
  prospect_name: string;
  preferred_model: string | null;
  transaction: string | null;
  sales_channel: string | null;
  purchase_timeline: string | null;
  pipeline_status: string;
  last_contact_date: string | null;
  next_action: string | null;
  next_action_due_date: string | null;
  next_action_completed_at: string | null;
  contact_number: string | null;
  email: string | null;
  location: string | null;
  remarks: string | null;
  is_archived: boolean;
  lost_at: string | null;
  legacy_key: string | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  owner_id: string;
  activity_type: string;
  activity_at: string;
  summary: string | null;
  notes: string | null;
  outcome: string | null;
  created_by: string | null;
  created_at: string;
}

export interface FinancingApplication {
  id: string;
  financing_code: string;
  lead_id: string;
  owner_id: string;
  date_submitted: string | null;
  lead_source: string | null;
  preferred_model: string | null;
  bank: string | null;
  application_status: string;
  date_approval: string | null;
  approved_dp: number | null;
  date_released: string | null;
  remarks: string | null;
  legacy_key: string | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  reservation_code: string;
  lead_id: string;
  owner_id: string;
  reservation_date: string | null;
  reserved_model: string | null;
  sales_channel: string | null;
  current_status: string;
  expected_release_date: string | null;
  last_customer_update: string | null;
  next_action: string | null;
  remarks: string | null;
  legacy_key: string | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleRelease {
  id: string;
  release_code: string;
  lead_id: string;
  reservation_id: string | null;
  owner_id: string;
  release_date: string;
  transaction: string | null;
  model_released: string | null;
  units_released: number;
  bank: string | null;
  remarks: string | null;
  legacy_key: string | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LostSale {
  id: string;
  lost_code: string;
  lead_id: string;
  owner_id: string;
  date_marked_lost: string;
  lead_source: string | null;
  preferred_model: string | null;
  pipeline_stage_when_lost: string | null;
  primary_loss_reason: string | null;
  competitor_alternative: string | null;
  financing_payment_issue: string | null;
  estimated_units_lost: number;
  recoverable: boolean;
  recovery_next_action: string | null;
  coaching_notes: string | null;
  recovery_status: "open" | "recovered" | "closed";
  recovered_at: string | null;
  legacy_key: string | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DropdownOption {
  id: string;
  category: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  owner_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface VehicleModel {
  id: string;
  name: string;
  make: string;
  model: string | null;
  variant: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlyTarget {
  id: string;
  owner_id: string | null;
  year: number;
  month: number;
  sales_target: number;
  financing_target: number;
  tfs_target: number;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  id: string;
  owner_id: string;
  key: string;
  value: Json;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  owner_id: string | null;
  table_name: string;
  record_id: string | null;
  record_code: string | null;
  action: string;
  old_data: Json | null;
  new_data: Json | null;
  changed_by: string | null;
  created_at: string;
}

export interface ImportBatch {
  id: string;
  owner_id: string;
  filename: string;
  record_counts: Json;
  issues: Json;
  created_by: string | null;
  created_at: string;
}

export interface SignupInvite {
  id: string;
  email: string;
  role: Exclude<CrmRole, "owner">;
  note: string | null;
  created_by: string | null;
  created_at: string;
  consumed_at: string | null;
  consumed_by: string | null;
}

type Widen<T> = { [K in keyof T]: T[K] };

type TableShape<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Widen<Row>;
  Insert: Widen<Insert>;
  Update: Widen<Update>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableShape<Profile>;
      leads: TableShape<Lead>;
      lead_activities: TableShape<LeadActivity>;
      financing_applications: TableShape<FinancingApplication>;
      reservations: TableShape<Reservation>;
      vehicle_releases: TableShape<VehicleRelease>;
      lost_sales: TableShape<LostSale>;
      dropdown_options: TableShape<DropdownOption>;
      vehicle_models: TableShape<VehicleModel>;
      monthly_targets: TableShape<MonthlyTarget>;
      app_settings: TableShape<AppSetting>;
      audit_logs: TableShape<AuditLog>;
      import_batches: TableShape<ImportBatch>;
      signup_invites: TableShape<SignupInvite>;
    };
    Views: Record<string, never>;
    Functions: {
      is_crm_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
