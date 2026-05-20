import {
  CONTRACT_REVIEW_LABEL,
  CONTRACT_REVIEW_PRIMARY_ENDPOINT,
  CONTRACT_REVIEW_PRIMARY_MODEL,
  CONTRACT_REVIEW_NAV_SECTION,
} from '../contract-review/config';
import {
  PAGEINDEX_CONTRACT_LABEL,
  PAGEINDEX_CONTRACT_NAV_SECTION,
  PAGEINDEX_CONTRACT_PRIMARY_ENDPOINT,
  PAGEINDEX_CONTRACT_PRIMARY_MODEL,
} from '../pageindex-contract/config';
import {
  LEGAL_RESEARCH_LABEL,
  LEGAL_RESEARCH_PRIMARY_ENDPOINT,
  LEGAL_RESEARCH_PRIMARY_MODEL,
  LEGAL_RESEARCH_NAV_SECTION,
  LEGAL_RESEARCH_V3_ENDPOINT,
  LEGAL_RESEARCH_V3_MODEL,
  RESEARCH_CASE_ENDPOINT,           RESEARCH_CASE_MODEL,
  RESEARCH_ISSUE_ENDPOINT,          RESEARCH_ISSUE_MODEL,
  RESEARCH_WRIT_ENDPOINT,           RESEARCH_WRIT_MODEL,
  RESEARCH_CRIMINAL_ENDPOINT,       RESEARCH_CRIMINAL_MODEL,
  RESEARCH_COMMERCIAL_ENDPOINT,     RESEARCH_COMMERCIAL_MODEL,
  RESEARCH_CONSTITUTIONAL_ENDPOINT, RESEARCH_CONSTITUTIONAL_MODEL,
  RESEARCH_STRESS_TEST_ENDPOINT,    RESEARCH_STRESS_TEST_MODEL,
} from '../legal-research/config';
import {
  DOC_DRAFTING_LABEL,
  DOC_DRAFTING_PRIMARY_ENDPOINT,
  DOC_DRAFTING_PRIMARY_MODEL,
} from '../doc-drafting/config';
import {
  LITIGATION_NAV_SECTION,
  LITIGATION_PRACTICE_SETUP_ENDPOINT,    LITIGATION_PRACTICE_SETUP_MODEL,
  LITIGATION_CASE_INTAKE_ENDPOINT,       LITIGATION_CASE_INTAKE_MODEL,
  LITIGATION_CASE_UPDATE_ENDPOINT,       LITIGATION_CASE_UPDATE_MODEL,
  LITIGATION_PORTFOLIO_ENDPOINT,         LITIGATION_PORTFOLIO_MODEL,
  LITIGATION_CHRONOLOGY_ENDPOINT,        LITIGATION_CHRONOLOGY_MODEL,
  LITIGATION_BRIEF_DRAFTER_ENDPOINT,     LITIGATION_BRIEF_DRAFTER_MODEL,
  LITIGATION_DEMAND_DRAFT_ENDPOINT,      LITIGATION_DEMAND_DRAFT_MODEL,
  LITIGATION_LEGAL_HOLD_ENDPOINT,        LITIGATION_LEGAL_HOLD_MODEL,
  LITIGATION_PROFILE_CUSTOMIZE_ENDPOINT, LITIGATION_PROFILE_CUSTOMIZE_MODEL,
  LITIGATION_CASE_WORKSPACE_ENDPOINT,    LITIGATION_CASE_WORKSPACE_MODEL,
  LITIGATION_CASE_BRIEFING_ENDPOINT,     LITIGATION_CASE_BRIEFING_MODEL,
  LITIGATION_CASE_CLOSE_ENDPOINT,        LITIGATION_CASE_CLOSE_MODEL,
  LITIGATION_PRIVILEGE_REVIEW_ENDPOINT,  LITIGATION_PRIVILEGE_REVIEW_MODEL,
  LITIGATION_WITNESS_PREP_ENDPOINT,      LITIGATION_WITNESS_PREP_MODEL,
  LITIGATION_ELEMENT_CHART_ENDPOINT,     LITIGATION_ELEMENT_CHART_MODEL,
  LITIGATION_LEGAL_NOTICE_INTAKE_ENDPOINT, LITIGATION_LEGAL_NOTICE_INTAKE_MODEL,
  LITIGATION_INBOUND_TRIAGE_ENDPOINT,    LITIGATION_INBOUND_TRIAGE_MODEL,
  LITIGATION_COURT_PROCESS_ENDPOINT,     LITIGATION_COURT_PROCESS_MODEL,
  LITIGATION_OC_STATUS_ENDPOINT,         LITIGATION_OC_STATUS_MODEL,
} from '../litigation/config';

export interface NavItem {
  label: string;
  endpointName: string;
  model: string;
  /** When true, renders as a phase-group divider label instead of a clickable item. */
  divider?: true;
}

export interface NavSection {
  sectionLabel: string;
  iconPath: string;
  items: NavItem[];
}

/** Convenience factory for divider entries — no endpoint, just a visual label. */
function div(label: string): NavItem {
  return { label, endpointName: '', model: '', divider: true };
}

export const NYAY_NAV_CONFIG: NavSection[] = [
  {
    sectionLabel: DOC_DRAFTING_LABEL,
    iconPath:
      'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    items: [
      {
        label: DOC_DRAFTING_LABEL,
        endpointName: DOC_DRAFTING_PRIMARY_ENDPOINT,
        model: DOC_DRAFTING_PRIMARY_MODEL,
      },
    ],
  },
  {
    sectionLabel: CONTRACT_REVIEW_NAV_SECTION,
    iconPath:
      'M20 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z',
    items: [
      {
        label: CONTRACT_REVIEW_LABEL,
        endpointName: CONTRACT_REVIEW_PRIMARY_ENDPOINT,
        model: CONTRACT_REVIEW_PRIMARY_MODEL,
      },
      {
        label: PAGEINDEX_CONTRACT_LABEL,
        endpointName: PAGEINDEX_CONTRACT_PRIMARY_ENDPOINT,
        model: PAGEINDEX_CONTRACT_PRIMARY_MODEL,
      },
    ],
  },
  {
    sectionLabel: LEGAL_RESEARCH_V3_ENDPOINT,
    iconPath:
      'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    items: [
      {
        label: 'Case Research',
        endpointName: RESEARCH_CASE_ENDPOINT,
        model: RESEARCH_CASE_MODEL,
      },
      {
        label: 'Issue Analysis',
        endpointName: RESEARCH_ISSUE_ENDPOINT,
        model: RESEARCH_ISSUE_MODEL,
      },
      {
        label: 'Writ Jurisdiction',
        endpointName: RESEARCH_WRIT_ENDPOINT,
        model: RESEARCH_WRIT_MODEL,
      },
      {
        label: 'Criminal Law',
        endpointName: RESEARCH_CRIMINAL_ENDPOINT,
        model: RESEARCH_CRIMINAL_MODEL,
      },
      {
        label: 'Commercial Disputes',
        endpointName: RESEARCH_COMMERCIAL_ENDPOINT,
        model: RESEARCH_COMMERCIAL_MODEL,
      },
      {
        label: 'Constitutional Law',
        endpointName: RESEARCH_CONSTITUTIONAL_ENDPOINT,
        model: RESEARCH_CONSTITUTIONAL_MODEL,
      },
      {
        label: 'Argument Stress Test',
        endpointName: RESEARCH_STRESS_TEST_ENDPOINT,
        model: RESEARCH_STRESS_TEST_MODEL,
      },
    ],
  },
  {
    sectionLabel: LEGAL_RESEARCH_NAV_SECTION,
    iconPath:
      'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    items: [
      {
        label: LEGAL_RESEARCH_LABEL,
        endpointName: LEGAL_RESEARCH_PRIMARY_ENDPOINT,
        model: LEGAL_RESEARCH_PRIMARY_MODEL,
      },
    ],
  },
  {
    sectionLabel: LITIGATION_NAV_SECTION,
    iconPath:
      'M12 3L2 9l10 6 10-6-10-6zM2 17l10 6 10-6M2 12l10 6 10-6',
    items: [
      // ── Setup ────────────────────────────────────────────────────────────────
      div('Setup'),
      {
        label: 'Practice Setup',
        endpointName: LITIGATION_PRACTICE_SETUP_ENDPOINT,
        model: LITIGATION_PRACTICE_SETUP_MODEL,
      },
      {
        label: 'Profile Customization',
        endpointName: LITIGATION_PROFILE_CUSTOMIZE_ENDPOINT,
        model: LITIGATION_PROFILE_CUSTOMIZE_MODEL,
      },
      // ── Case Management ───────────────────────────────────────────────────────
      div('Case Management'),
      {
        label: 'Case Intake',
        endpointName: LITIGATION_CASE_INTAKE_ENDPOINT,
        model: LITIGATION_CASE_INTAKE_MODEL,
      },
      {
        label: 'Case Update',
        endpointName: LITIGATION_CASE_UPDATE_ENDPOINT,
        model: LITIGATION_CASE_UPDATE_MODEL,
      },
      {
        label: 'Case Workspace',
        endpointName: LITIGATION_CASE_WORKSPACE_ENDPOINT,
        model: LITIGATION_CASE_WORKSPACE_MODEL,
      },
      {
        label: 'Case Briefing',
        endpointName: LITIGATION_CASE_BRIEFING_ENDPOINT,
        model: LITIGATION_CASE_BRIEFING_MODEL,
      },
      {
        label: 'Close Case',
        endpointName: LITIGATION_CASE_CLOSE_ENDPOINT,
        model: LITIGATION_CASE_CLOSE_MODEL,
      },
      // ── Portfolio ─────────────────────────────────────────────────────────────
      div('Portfolio'),
      {
        label: 'Portfolio Status',
        endpointName: LITIGATION_PORTFOLIO_ENDPOINT,
        model: LITIGATION_PORTFOLIO_MODEL,
      },
      // ── Active Litigation ─────────────────────────────────────────────────────
      div('Active Litigation'),
      {
        label: 'Case Chronology',
        endpointName: LITIGATION_CHRONOLOGY_ENDPOINT,
        model: LITIGATION_CHRONOLOGY_MODEL,
      },
      {
        label: 'Privilege Review',
        endpointName: LITIGATION_PRIVILEGE_REVIEW_ENDPOINT,
        model: LITIGATION_PRIVILEGE_REVIEW_MODEL,
      },
      {
        label: 'Witness Exam Prep',
        endpointName: LITIGATION_WITNESS_PREP_ENDPOINT,
        model: LITIGATION_WITNESS_PREP_MODEL,
      },
      {
        label: 'Element / Claim Chart',
        endpointName: LITIGATION_ELEMENT_CHART_ENDPOINT,
        model: LITIGATION_ELEMENT_CHART_MODEL,
      },
      {
        label: 'Brief Section Drafter',
        endpointName: LITIGATION_BRIEF_DRAFTER_ENDPOINT,
        model: LITIGATION_BRIEF_DRAFTER_MODEL,
      },
      // ── Notices & Correspondence ──────────────────────────────────────────────
      div('Notices & Correspondence'),
      {
        label: 'Demand / Legal Notice',
        endpointName: LITIGATION_DEMAND_DRAFT_ENDPOINT,
        model: LITIGATION_DEMAND_DRAFT_MODEL,
      },
      {
        label: 'Legal Notice Intake',
        endpointName: LITIGATION_LEGAL_NOTICE_INTAKE_ENDPOINT,
        model: LITIGATION_LEGAL_NOTICE_INTAKE_MODEL,
      },
      {
        label: 'Inbound Notice Triage',
        endpointName: LITIGATION_INBOUND_TRIAGE_ENDPOINT,
        model: LITIGATION_INBOUND_TRIAGE_MODEL,
      },
      {
        label: 'Court Process Triage',
        endpointName: LITIGATION_COURT_PROCESS_ENDPOINT,
        model: LITIGATION_COURT_PROCESS_MODEL,
      },
      {
        label: 'Outside Counsel Status',
        endpointName: LITIGATION_OC_STATUS_ENDPOINT,
        model: LITIGATION_OC_STATUS_MODEL,
      },
      // ── Risk & Compliance ─────────────────────────────────────────────────────
      div('Risk & Compliance'),
      {
        label: 'Legal Hold',
        endpointName: LITIGATION_LEGAL_HOLD_ENDPOINT,
        model: LITIGATION_LEGAL_HOLD_MODEL,
      },
    ],
  },
];

export const NYAY_ENDPOINT_LABELS: Record<string, string> = {
  [DOC_DRAFTING_PRIMARY_ENDPOINT]:              DOC_DRAFTING_LABEL,
  [CONTRACT_REVIEW_PRIMARY_ENDPOINT]:           CONTRACT_REVIEW_LABEL,
  [PAGEINDEX_CONTRACT_PRIMARY_ENDPOINT]:        PAGEINDEX_CONTRACT_LABEL,
  [LEGAL_RESEARCH_PRIMARY_ENDPOINT]:            LEGAL_RESEARCH_LABEL,
  [LEGAL_RESEARCH_V3_ENDPOINT]:                 LEGAL_RESEARCH_V3_ENDPOINT,
  [RESEARCH_CASE_ENDPOINT]:                     'Case Research',
  [RESEARCH_ISSUE_ENDPOINT]:                    'Issue Analysis',
  [RESEARCH_WRIT_ENDPOINT]:                     'Writ Jurisdiction',
  [RESEARCH_CRIMINAL_ENDPOINT]:                 'Criminal Law',
  [RESEARCH_COMMERCIAL_ENDPOINT]:               'Commercial Disputes',
  [RESEARCH_CONSTITUTIONAL_ENDPOINT]:           'Constitutional Law',
  [RESEARCH_STRESS_TEST_ENDPOINT]:              'Argument Stress Test',
  [LITIGATION_PRACTICE_SETUP_ENDPOINT]:         'Practice Setup',
  [LITIGATION_CASE_INTAKE_ENDPOINT]:            'Case Intake',
  [LITIGATION_CASE_UPDATE_ENDPOINT]:            'Case Update',
  [LITIGATION_PORTFOLIO_ENDPOINT]:              'Portfolio Status',
  [LITIGATION_CHRONOLOGY_ENDPOINT]:             'Case Chronology',
  [LITIGATION_BRIEF_DRAFTER_ENDPOINT]:          'Brief Section Drafter',
  [LITIGATION_DEMAND_DRAFT_ENDPOINT]:           'Demand / Legal Notice',
  [LITIGATION_LEGAL_HOLD_ENDPOINT]:             'Legal Hold',
  [LITIGATION_PROFILE_CUSTOMIZE_ENDPOINT]:      'Profile Customization',
  [LITIGATION_CASE_WORKSPACE_ENDPOINT]:         'Case Workspace',
  [LITIGATION_CASE_BRIEFING_ENDPOINT]:          'Case Briefing',
  [LITIGATION_CASE_CLOSE_ENDPOINT]:             'Close Case',
  [LITIGATION_PRIVILEGE_REVIEW_ENDPOINT]:       'Privilege Review',
  [LITIGATION_WITNESS_PREP_ENDPOINT]:           'Witness Exam Prep',
  [LITIGATION_ELEMENT_CHART_ENDPOINT]:          'Element / Claim Chart',
  [LITIGATION_LEGAL_NOTICE_INTAKE_ENDPOINT]:    'Legal Notice Intake',
  [LITIGATION_INBOUND_TRIAGE_ENDPOINT]:         'Inbound Notice Triage',
  [LITIGATION_COURT_PROCESS_ENDPOINT]:          'Court Process Triage',
  [LITIGATION_OC_STATUS_ENDPOINT]:              'Outside Counsel Status',
};

export const NYAY_ENDPOINTS = new Set(Object.keys(NYAY_ENDPOINT_LABELS));
