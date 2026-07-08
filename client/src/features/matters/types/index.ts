// ── Auth ──────────────────────────────────────────────────────────────────────
export interface TokenResponse {
  access_token: string;
  token_type: string;
  firm_id: string;
  user_id: string;
}

// ── Enums ─────────────────────────────────────────────────────────────────────
export type PracticeArea = "criminal" | "civil" | "writ" | "commercial" | "family" | "arbitration" | "other";
export type MatterStatus = "active" | "dormant" | "closed" | "archived";
export type ECourtsSyncStatus = "synced" | "sync_failed" | "not_configured" | "pending_cnr";
export type HearingStatus = "scheduled" | "heard" | "adjourned" | "stayed" | "part_heard";
export type HearingSource = "ecourts" | "manual";
export type ActionPriority = "low" | "normal" | "high" | "urgent";
export type ActionStatus = "pending" | "in_progress" | "done" | "dropped";
export type PartyRole = "petitioner" | "respondent" | "accused" | "complainant" | "appellant" | "plaintiff" | "defendant" | "other";
export type MatterRole = "lead" | "associate" | "junior" | "observer" | "clerk";
export type OrderProcessingStatus = "pending" | "processing" | "done" | "failed";

// ── Core entities ─────────────────────────────────────────────────────────────
export interface ECourtsMeta {
  judge_names: string[];
  case_type: string | null;
  judicial_section: string | null;
  registration_number: string | null;
  filing_number: string | null;
  decision_date: string | null;
  case_category: string | null;
  filed_documents: {
    sr_no: string; document: string; date: string | null;
    filed_by: string | null; advocate: string | null;
  }[];
  disposal_type: string | null;
  ecourts_url: string | null;
}

export interface Matter {
  id: string;
  firm_id: string;
  title: string;
  cnr_number: string | null;
  court_code: string | null;
  practice_area: PracticeArea;
  status: MatterStatus;
  stage: string | null;
  bnss_flag: boolean;
  ecourts_sync_status: ECourtsSyncStatus;
  last_sync_at: string | null;
  next_hearing_date: string | null;
  cause_list_position: string | null;
  last_order_summary: string | null;
  vakalat_filed: boolean;
  ecourts_metadata: ECourtsMeta | null;
  created_at: string;
  updated_at: string;
}

export interface MatterListItem {
  id: string;
  title: string;
  cnr_number: string | null;
  court_code: string | null;
  practice_area: PracticeArea;
  status: MatterStatus;
  next_hearing_date: string | null;
  cause_list_position: string | null;
  last_order_summary: string | null;
  ecourts_sync_status: ECourtsSyncStatus;
  created_at: string;
}

export interface Hearing {
  id: string;
  matter_id: string;
  date: string;
  court_code: string | null;
  court_room: string | null;
  cause_list_item: string | null;
  stage: string | null;
  status: HearingStatus;
  assigned_to: string | null;
  source: HearingSource;
  pre_hearing_note: string | null;
  post_hearing_note: string | null;
  post_hearing_summary: string | null;
  adjournment_reason: string | null;
  created_at: string;
}

export interface Action {
  id: string;
  matter_id: string;
  source_order_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: ActionPriority;
  status: ActionStatus;
  assigned_to: string | null;
  created_by: string;
  confirmed_at: string | null;
  created_at: string;
}

export interface Party {
  id: string;
  name: string;
  role: PartyRole;
  counsel: string | null;
  is_our_client: boolean;
  source: string;
}

export interface Note {
  id: string;
  matter_id: string;
  hearing_id: string | null;
  author_id: string;
  content: string;
  is_client_visible: boolean;
  mentions: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  matter_id: string;
  order_date: string | null;
  order_type: string | null;
  source: string;
  ai_summary: string | null;
  ocr_text: string | null;
  next_hearing_date: string | null;
  bnss_flag: boolean;
  bnss_flag_detail: Record<string, unknown> | null;
  processing_status: OrderProcessingStatus;
  document_id: string | null;
}

export interface MatterResearch {
  id: string;
  query: string;
  skill_used: string | null;
  court_context: string | null;
  stage_context: string | null;
  response_summary: string | null;
  citations: unknown[] | null;
  created_at: string;
  user_id: string;
}

export interface MatterMember {
  matter_id: string;
  user_id: string;
  name: string | null;
  matter_role: MatterRole;
  can_edit: boolean;
  can_view_documents: boolean;
  can_assign_tasks: boolean;
  added_at: string;
}

export interface FirmMember {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  firm_role: string;
  is_active: boolean;
  created_at: string;
}

export interface TimelineEvent {
  type: "hearing" | "order" | "note";
  date: string;
  id: string;
  [key: string]: unknown;
}

// ── API wrapper ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}
