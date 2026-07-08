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
  /**
   * When set, clicking this item navigates to the given React Router path
   * instead of creating a new conversation. Used for non-chat panels (e.g. Matter Management).
   */
  routePath?: string;
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

/** Convenience factory for route-linked items (no endpoint or model needed). */
function route(label: string, routePath: string): NavItem {
  return { label, endpointName: '', model: '', routePath };
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

  // ── Matter Management (LPMS) ──────────────────────────────────────────────
  {
    sectionLabel: 'Matter Management',
    iconPath:
      'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 8c-2 0-6 1-6 3v1h12v-1c0-2-4-3-6-3z',
    items: [
      route('Matters', '/matters'),
      route('My Tasks', '/matters?tab=inbox'),
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

export const NYAY_ENDPOINT_DESCRIPTIONS: Record<string, string> = {
  // ── Legal Research v3 skills ──────────────────────────────────────────────
  [RESEARCH_CASE_ENDPOINT]:
    'Find and verify Indian case law across the Supreme Court and all High Courts.\n' +
    "NyayAI's three-source citation pipeline ranks authorities by judicial hierarchy and flags negative treatment before output.\n" +
    'Every citation is tagged [VERIFIED] or [VERIFY REQUIRED] — nothing unverified reaches your brief.\n' +
    'Use when you need to identify the leading authorities on any legal proposition.',

  [RESEARCH_ISSUE_ENDPOINT]:
    'Full five-step research workflow for any complex legal matter.\n' +
    'Delivers applicable law, verified precedents, synthesis of the current position, strategic options, and a recommended approach.\n' +
    'Anchors every proposition to the verified case law pipeline and flags conflicting or overruled authorities.\n' +
    'Use for deep pre-litigation assessment, advisory opinions, or preparing written arguments.',

  [RESEARCH_WRIT_ENDPOINT]:
    'Maintainability analysis for Article 226 (High Court) and Article 32 (Supreme Court) writ petitions.\n' +
    'Covers the alternate remedy bar, locus standi, delay and laches, and the correct writ type for the relief claimed.\n' +
    'Flags jurisdictional pitfalls before filing and maps the relief to the appropriate writ form.\n' +
    'Use to assess writ fitness before briefing counsel.',

  [RESEARCH_CRIMINAL_ENDPOINT]:
    'Research under both Indian criminal law regimes — BNSS 2023/BNS 2023/BSA 2023 for offences on or after 1 July 2024, and CrPC/IPC/Evidence Act for earlier offences.\n' +
    'Covers bail jurisprudence (anticipatory, regular, statutory), FIR validity, charge sustainability, and quashing under s.482 CrPC / s.528 BNSS.\n' +
    'Every proposition is anchored to verified Supreme Court and High Court authorities.\n' +
    'Use for bail applications, charge-framing challenges, quashing petitions, and trial strategy research.',

  [RESEARCH_COMMERCIAL_ENDPOINT]:
    'Research for contract disputes, arbitration, injunctions, and commercial court matters under Indian law.\n' +
    'Covers ICA 1872, Arbitration and Conciliation Act 1996, specific performance, interim injunction standards, limitation, and the Commercial Courts Act.\n' +
    'Applicable to disputes before Civil Courts, Commercial Courts, NCLT, and arbitral tribunals.\n' +
    'Use for pre-litigation assessment, arbitration clause analysis, or preparing arguments on any commercial dispute.',

  [RESEARCH_CONSTITUTIONAL_ENDPOINT]:
    'Research on fundamental rights (Articles 12–35), proportionality doctrine, Article 14 arbitrariness review, PIL maintainability, and legislative competence.\n' +
    'Covers landmark Supreme Court constitutional bench decisions and the current position on judicial review of executive and legislative action.\n' +
    'Use for writ petitions challenging state action, policy, or legislation, or advisory opinions on constitutional validity.\n' +
    'Every authority is tagged by bench composition and constitutional bench status.',

  // ── Litigation skills ─────────────────────────────────────────────────────
  [LITIGATION_PRACTICE_SETUP_ENDPOINT]:
    "Set up your firm's litigation practice profile — the foundation for every NyayAI skill.\n" +
    'Provide your practice areas, courts, risk thresholds, escalation norms, and citation style in a guided interview.\n' +
    'NyayAI calibrates every skill output — risk ratings, flag levels, and drafting tone — against this profile.\n' +
    'Run once at onboarding, or whenever your practice focus changes significantly.',

  [LITIGATION_CASE_INTAKE_ENDPOINT]:
    'Register a new matter and build the initial case file.\n' +
    "Provide the client's instructions, key facts, parties, court, and cause of action.\n" +
    'NyayAI identifies the limitation date, runs a conflicts check, and saves the case to your portfolio.\n' +
    'Every active-litigation skill depends on a completed Case Intake entry for the matter.',

  [LITIGATION_CASE_UPDATE_ENDPOINT]:
    'Record what happened at a hearing, conference, or in-chambers event.\n' +
    'Update the next hearing date, log orders passed, and note any new evidence or witnesses.\n' +
    'NyayAI appends the update to the case history and recalculates stale risk or limitation flags.\n' +
    'Keep this current after every court appearance to maintain an accurate portfolio view.',

  [LITIGATION_PORTFOLIO_ENDPOINT]:
    'See a risk-rated overview of your entire active litigation portfolio.\n' +
    'Surfaces hearing dates in the next 60 days, approaching limitation cliffs, and preservation notice gaps.\n' +
    'Critical items appear at the top with a suggested action for each.\n' +
    'Use as your daily or weekly practice health check — nothing falls through the gaps.',

  [LITIGATION_CHRONOLOGY_ENDPOINT]:
    'Build a structured fact chronology for a matter, mapped to the applicable legal elements.\n' +
    'Events are ordered chronologically and tagged by relevance to the cause of action, defences, or relief claimed.\n' +
    'Gaps and unexplained intervals are flagged for follow-up.\n' +
    'Outputs in three formats: working chronology, List of Dates (for petitions), or Statement of Facts.',

  [LITIGATION_BRIEF_DRAFTER_ENDPOINT]:
    'Draft arguments, grounds of challenge, or written submissions for any section of a brief or petition.\n' +
    'Provide the legal issue, factual matrix, and relief sought — NyayAI drafts in proper legal style with cited propositions tagged [verify].\n' +
    'Covers writ petitions, appeals, written arguments, SLPs, and written statements.\n' +
    'All criminal provisions are verified against the BNS/BNSS supersession table before inclusion.',

  [LITIGATION_DEMAND_DRAFT_ENDPOINT]:
    'Draft a legal notice under Indian law for any cause of action.\n' +
    'Covers pre-suit demand notices, statutory notices under specific Acts, and pre-arbitration or consumer-forum notices.\n' +
    'All Indian pre-suit conditions are gate-checked first — s.80 CPC, s.138 NI Act, s.21 Arbitration Act.\n' +
    'Output follows the required format: addressee, facts, legal basis, demand, and response deadline.',

  [LITIGATION_LEGAL_HOLD_ENDPOINT]:
    'Issue, track, and refresh preservation notices for electronically stored information and physical records.\n' +
    "Generates a notice tailored to the matter's facts and custodians identified at intake.\n" +
    's.65B certificate requirements are flagged for electronic records; renewal alerts track refresh dates across the portfolio.\n' +
    'Required for any matter with significant document-discovery risk.',

  [LITIGATION_PROFILE_CUSTOMIZE_ENDPOINT]:
    'Update your practice profile without running the full setup interview.\n' +
    'Adjust risk thresholds, add a practice area, or revise court and jurisdiction preferences.\n' +
    'Changes take effect immediately across all active skills.\n' +
    'Use for mid-year practice adjustments or when onboarding a new practice group.',

  [LITIGATION_CASE_WORKSPACE_ENDPOINT]:
    'Access the full case file for any matter in one view — facts, procedural history, parties, risk rating, and key dates.\n' +
    'Use as your reference before a hearing, client call, or drafting session.\n' +
    'All active-litigation skills can be launched from within the workspace.\n' +
    'Read-only: no intake or update actions are performed here.',

  [LITIGATION_CASE_BRIEFING_ENDPOINT]:
    'Generate a structured briefing for new counsel or a team member coming onto a matter.\n' +
    'Covers facts, cause of action, procedural status, key legal issues, and immediate action items.\n' +
    'Specify the audience — partner, client, or board — and the briefing tone adjusts accordingly.\n' +
    'Requires a completed Case Intake for the matter.',

  [LITIGATION_CASE_CLOSE_ENDPOINT]:
    'Close a matter and record the final outcome — judgment, settlement, dismissal, or withdrawal.\n' +
    'NyayAI flags outstanding obligations before archiving: execution proceedings, appeal windows, compliance orders, unreleased legal holds.\n' +
    'Generates a closure note and marks the case inactive in the portfolio.\n' +
    'The matter remains searchable in closed status for future reference.',

  [LITIGATION_PRIVILEGE_REVIEW_ENDPOINT]:
    'Review documents and communications for legal professional privilege before disclosure or production.\n' +
    'Classifies each item as Privileged, Potentially Privileged, or Not Privileged under Indian Evidence Act / BSA standards.\n' +
    'Flags waiver risks from inadvertent disclosure, joint-interest sharing, or crime-fraud exception exposure.\n' +
    'Use before responding to discovery, RTI requests, or any court-directed document production.',

  [LITIGATION_WITNESS_PREP_ENDPOINT]:
    'Draft examination-in-chief outlines and cross-examination question sets for any witness.\n' +
    'Questions are anchored to the case\'s disputed facts and legal elements, with suggested exhibits to put to the witness.\n' +
    'Credibility points, prior inconsistent statements, and hearsay risks are flagged where identified.\n' +
    'Use to prepare for upcoming evidence hearings — covers EIC affidavits, cross-examination, and interrogatories.',

  [LITIGATION_ELEMENT_CHART_ENDPOINT]:
    'Map the facts in your case to the legal elements required to establish — or defeat — the cause of action.\n' +
    'Identifies which elements are well-supported, which are disputed, and where the evidentiary gap lies.\n' +
    'Use to assess litigation risk, structure submissions, and identify evidence still needed before the next hearing.\n' +
    'Also supports infringement and revocation analysis in IP matters.',

  [LITIGATION_LEGAL_NOTICE_INTAKE_ENDPOINT]:
    'Register a legal notice received by your client and extract its key claims, demands, and response deadlines.\n' +
    'NyayAI creates a matter entry, identifies the statutory basis, and flags the response window.\n' +
    'Use as the starting point before drafting a reply or assessing exposure from an inbound demand.\n' +
    'Pairs with Inbound Notice Triage for a complete first-response workflow.',

  [LITIGATION_INBOUND_TRIAGE_ENDPOINT]:
    'Quickly assess a received notice — legal, statutory, or regulatory — for urgency, risk, and required response.\n' +
    'Identifies the issuing authority, the claim or demand, and the applicable response deadline.\n' +
    'Runs a BNS/BNSS supersession check and cross-checks the portfolio for related active matters.\n' +
    'Use for first-pass triage before assigning the matter to a case handler.',

  [LITIGATION_COURT_PROCESS_ENDPOINT]:
    'Review a received court summons, notice, or process and identify the required response, filing deadline, and procedural obligations.\n' +
    'Distinguishes appearance-only requirements from substantive-response obligations.\n' +
    'Flags jurisdictional issues, service defects, and grounds for challenge to the process.\n' +
    'Use as the first step after receiving any court paper — before assigning or diarising the matter.',

  [LITIGATION_OC_STATUS_ENDPOINT]:
    'Track the status of matters being managed by external counsel.\n' +
    'Drafts structured status request emails for all active matters with assigned outside counsel.\n' +
    'Flags matters that have gone quiet or where a report from outside counsel is overdue.\n' +
    'Use to maintain visibility across matters not handled in-house and keep outside counsel accountable.',
};
