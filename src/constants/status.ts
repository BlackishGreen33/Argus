export const TRIAGE_STATUSES = ["PENDING", "CONFIRMED", "DEFERRED", "FALSE_POSITIVE"] as const;
export type TriageStatus = (typeof TRIAGE_STATUSES)[number];

export const CANDIDATE_STATUSES = ["CANDIDATE", "CONFIRMED", "REJECTED"] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const CANDIDATE_MUTATION_STATUSES = ["CONFIRMED", "REJECTED"] as const;
export const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
