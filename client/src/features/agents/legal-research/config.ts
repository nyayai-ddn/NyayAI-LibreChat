type EndpointLike = { name: string };

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? '';

export const LEGAL_RESEARCH_PRIMARY_ENDPOINT = 'Legal Research';
export const LEGAL_RESEARCH_V3_ENDPOINT = 'Legal Research v3';

// NyayAI Legal Research skill endpoints (nyay-legal-research backend, port 8106)
export const RESEARCH_CASE_ENDPOINT           = 'Case Research';
export const RESEARCH_ISSUE_ENDPOINT          = 'Issue Analysis';
export const RESEARCH_WRIT_ENDPOINT           = 'Writ Jurisdiction';
export const RESEARCH_CRIMINAL_ENDPOINT       = 'Criminal Law';
export const RESEARCH_COMMERCIAL_ENDPOINT     = 'Commercial Disputes';
export const RESEARCH_CONSTITUTIONAL_ENDPOINT = 'Constitutional Law';
export const RESEARCH_STRESS_TEST_ENDPOINT    = 'Argument Stress Test';

export const LEGAL_RESEARCH_ENDPOINT_ALIASES = [
  LEGAL_RESEARCH_PRIMARY_ENDPOINT,
  LEGAL_RESEARCH_V3_ENDPOINT,
  RESEARCH_CASE_ENDPOINT,
  RESEARCH_ISSUE_ENDPOINT,
  RESEARCH_WRIT_ENDPOINT,
  RESEARCH_CRIMINAL_ENDPOINT,
  RESEARCH_COMMERCIAL_ENDPOINT,
  RESEARCH_CONSTITUTIONAL_ENDPOINT,
  RESEARCH_STRESS_TEST_ENDPOINT,
] as const;

export const LEGAL_RESEARCH_PRIMARY_MODEL = 'Legal Research Assistant';
export const LEGAL_RESEARCH_V3_MODEL = 'legal-research-v3';

// Model slugs — must match config/skills.yaml in nyay-research-backend
export const RESEARCH_CASE_MODEL           = 'nyay-case-research';
export const RESEARCH_ISSUE_MODEL          = 'nyay-issue-analysis';
export const RESEARCH_WRIT_MODEL           = 'nyay-writ';
export const RESEARCH_CRIMINAL_MODEL       = 'nyay-criminal';
export const RESEARCH_COMMERCIAL_MODEL     = 'nyay-commercial';
export const RESEARCH_CONSTITUTIONAL_MODEL = 'nyay-constitutional';
export const RESEARCH_STRESS_TEST_MODEL    = 'nyay-stress-test';

export const LEGAL_RESEARCH_MODEL_ALIASES = [
  LEGAL_RESEARCH_PRIMARY_MODEL,
  'legal-research',
  'Legal Research',
  LEGAL_RESEARCH_V3_MODEL,
  LEGAL_RESEARCH_V3_ENDPOINT,
  RESEARCH_CASE_MODEL,
  RESEARCH_ISSUE_MODEL,
  RESEARCH_WRIT_MODEL,
  RESEARCH_CRIMINAL_MODEL,
  RESEARCH_COMMERCIAL_MODEL,
  RESEARCH_CONSTITUTIONAL_MODEL,
  RESEARCH_STRESS_TEST_MODEL,
] as const;

export const LEGAL_RESEARCH_LABEL = 'Legal Research';
export const LEGAL_RESEARCH_NAV_SECTION = 'Legal Research';

const LEGAL_RESEARCH_ENDPOINT_SET = new Set(
  LEGAL_RESEARCH_ENDPOINT_ALIASES.map((value) => normalize(value)),
);
const LEGAL_RESEARCH_MODEL_SET = new Set(
  LEGAL_RESEARCH_MODEL_ALIASES.map((value) => normalize(value)),
);

export function isLegalResearchEndpointName(value?: string | null) {
  return LEGAL_RESEARCH_ENDPOINT_SET.has(normalize(value));
}

export function isLegalResearchModelName(value?: string | null) {
  return LEGAL_RESEARCH_MODEL_SET.has(normalize(value));
}

export function resolveLegalResearchEndpointName(endpoints?: EndpointLike[]) {
  for (const endpointName of LEGAL_RESEARCH_ENDPOINT_ALIASES) {
    if (endpoints?.some((endpoint) => endpoint.name === endpointName)) {
      return endpointName;
    }
  }

  return null;
}
