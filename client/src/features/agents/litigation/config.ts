// Litigation feature — endpoint names must match `name:` in librechat.yaml exactly.

export const LITIGATION_NAV_SECTION = 'Litigation';

// Endpoint names (librechat.yaml `name:` field)
export const LITIGATION_PRACTICE_SETUP_ENDPOINT      = 'Practice Setup';
export const LITIGATION_CASE_INTAKE_ENDPOINT         = 'Case Intake';
export const LITIGATION_CASE_UPDATE_ENDPOINT         = 'Case Update';
export const LITIGATION_PORTFOLIO_ENDPOINT           = 'Portfolio Status';
export const LITIGATION_CHRONOLOGY_ENDPOINT          = 'Case Chronology';
export const LITIGATION_BRIEF_DRAFTER_ENDPOINT       = 'Brief Section Drafter';
export const LITIGATION_DEMAND_DRAFT_ENDPOINT        = 'Demand / Legal Notice';
export const LITIGATION_LEGAL_HOLD_ENDPOINT          = 'Legal Hold';

// Model slugs (librechat.yaml `models.default[0]:` field)
export const LITIGATION_PRACTICE_SETUP_MODEL         = 'nyay-cold-start';
export const LITIGATION_CASE_INTAKE_MODEL            = 'nyay-matter-intake';
export const LITIGATION_CASE_UPDATE_MODEL            = 'nyay-matter-update';
export const LITIGATION_PORTFOLIO_MODEL              = 'nyay-portfolio';
export const LITIGATION_CHRONOLOGY_MODEL             = 'nyay-chronology';
export const LITIGATION_BRIEF_DRAFTER_MODEL          = 'nyay-brief-drafter';
export const LITIGATION_DEMAND_DRAFT_MODEL           = 'nyay-demand-draft';
export const LITIGATION_LEGAL_HOLD_MODEL             = 'nyay-legal-hold';

// New endpoints — Phase 2
export const LITIGATION_PROFILE_CUSTOMIZE_ENDPOINT   = 'Profile Customization';
export const LITIGATION_CASE_WORKSPACE_ENDPOINT      = 'Case Workspace';
export const LITIGATION_CASE_BRIEFING_ENDPOINT       = 'Case Briefing';
export const LITIGATION_CASE_CLOSE_ENDPOINT          = 'Close Case';
export const LITIGATION_PRIVILEGE_REVIEW_ENDPOINT    = 'Privilege Review';
export const LITIGATION_WITNESS_PREP_ENDPOINT        = 'Witness Exam Prep';
export const LITIGATION_ELEMENT_CHART_ENDPOINT       = 'Element / Claim Chart';
export const LITIGATION_LEGAL_NOTICE_INTAKE_ENDPOINT = 'Legal Notice Intake';
export const LITIGATION_INBOUND_TRIAGE_ENDPOINT      = 'Inbound Notice Triage';
export const LITIGATION_COURT_PROCESS_ENDPOINT       = 'Court Process Triage';
export const LITIGATION_OC_STATUS_ENDPOINT           = 'Outside Counsel Status';

export const LITIGATION_PROFILE_CUSTOMIZE_MODEL      = 'nyay-profile-customize';
export const LITIGATION_CASE_WORKSPACE_MODEL         = 'nyay-case-workspace';
export const LITIGATION_CASE_BRIEFING_MODEL          = 'nyay-case-briefing';
export const LITIGATION_CASE_CLOSE_MODEL             = 'nyay-case-close';
export const LITIGATION_PRIVILEGE_REVIEW_MODEL       = 'nyay-privilege-review';
export const LITIGATION_WITNESS_PREP_MODEL           = 'nyay-witness-prep';
export const LITIGATION_ELEMENT_CHART_MODEL          = 'nyay-element-chart';
export const LITIGATION_LEGAL_NOTICE_INTAKE_MODEL    = 'nyay-legal-notice-intake';
export const LITIGATION_INBOUND_TRIAGE_MODEL         = 'nyay-inbound-triage';
export const LITIGATION_COURT_PROCESS_MODEL          = 'nyay-court-process';
export const LITIGATION_OC_STATUS_MODEL              = 'nyay-oc-status';

export const LITIGATION_ENDPOINT_ALIASES = [
  LITIGATION_PRACTICE_SETUP_ENDPOINT,
  LITIGATION_CASE_INTAKE_ENDPOINT,
  LITIGATION_CASE_UPDATE_ENDPOINT,
  LITIGATION_PORTFOLIO_ENDPOINT,
  LITIGATION_CHRONOLOGY_ENDPOINT,
  LITIGATION_BRIEF_DRAFTER_ENDPOINT,
  LITIGATION_DEMAND_DRAFT_ENDPOINT,
  LITIGATION_LEGAL_HOLD_ENDPOINT,
  LITIGATION_PROFILE_CUSTOMIZE_ENDPOINT,
  LITIGATION_CASE_WORKSPACE_ENDPOINT,
  LITIGATION_CASE_BRIEFING_ENDPOINT,
  LITIGATION_CASE_CLOSE_ENDPOINT,
  LITIGATION_PRIVILEGE_REVIEW_ENDPOINT,
  LITIGATION_WITNESS_PREP_ENDPOINT,
  LITIGATION_ELEMENT_CHART_ENDPOINT,
  LITIGATION_LEGAL_NOTICE_INTAKE_ENDPOINT,
  LITIGATION_INBOUND_TRIAGE_ENDPOINT,
  LITIGATION_COURT_PROCESS_ENDPOINT,
  LITIGATION_OC_STATUS_ENDPOINT,
] as const;
