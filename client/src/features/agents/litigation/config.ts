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

export const LITIGATION_ENDPOINT_ALIASES = [
  LITIGATION_PRACTICE_SETUP_ENDPOINT,
  LITIGATION_CASE_INTAKE_ENDPOINT,
  LITIGATION_CASE_UPDATE_ENDPOINT,
  LITIGATION_PORTFOLIO_ENDPOINT,
  LITIGATION_CHRONOLOGY_ENDPOINT,
  LITIGATION_BRIEF_DRAFTER_ENDPOINT,
  LITIGATION_DEMAND_DRAFT_ENDPOINT,
  LITIGATION_LEGAL_HOLD_ENDPOINT,
] as const;
