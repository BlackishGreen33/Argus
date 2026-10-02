import { z } from "zod";

import { CANDIDATE_MUTATION_STATUSES, SEVERITIES, TRIAGE_STATUSES } from "@/constants/status";

export const cvePatchSchema = z.object({
  title: z.string().min(1).max(512).optional(),
  description: z.string().min(1).max(20000).optional(),
  severity: z.enum(SEVERITIES).optional(),
  cvssScoreV2: z.number().min(0).max(10).nullable().optional(),
  cvssScoreV3: z.number().min(0).max(10).nullable().optional(),
  cvssScoreV4: z.number().min(0).max(10).nullable().optional(),
  affectedVersions: z.array(z.string()).optional(),
  cweIds: z.array(z.string()).optional(),
});

export const componentSchema = z.object({
  purl: z.string().min(3).max(512),
  cpe: z.string().max(255).nullable().optional(),
  type: z.string().max(255).nullable().optional(),
  vendor: z.string().max(255).nullable().optional(),
  name: z.string().min(1).max(255),
  version: z.string().min(1).max(255),
  license: z.string().max(1000).nullable().optional(),
  description: z.string().max(20000).nullable().optional(),
  repository: z.string().url().or(z.literal("")).nullable().optional(),
  publishDate: z.string().nullable().optional(),
  language: z.string().max(255).nullable().optional(),
  recordTime: z.string().nullable().optional(),
});

export const batchStatusSchema = z.object({
  cveIds: z.array(z.string().min(1)).min(1),
  status: z.enum(TRIAGE_STATUSES),
});

export const candidateStatusSchema = z.object({
  status: z.enum(CANDIDATE_MUTATION_STATUSES),
});

export const importWorkerSchema = z.object({
  jobId: z.string().min(1),
  actorEmail: z.string().optional(),
});

export const cveListQuerySchema = z.object({
  query: z.string().optional(),
  severity: z.enum(SEVERITIES).optional(),
  status: z.enum(TRIAGE_STATUSES).optional(),
  ecosystem: z
    .string()
    .regex(/^[a-z0-9.+-]+$/i)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(5000).default(10),
});
