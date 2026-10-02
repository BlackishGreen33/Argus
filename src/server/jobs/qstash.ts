import "server-only";

import { Client, Receiver } from "@upstash/qstash";

const token = process.env.QSTASH_TOKEN?.trim();
const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim();
const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY?.trim();

export const qstash = token ? new Client({ token }) : null;
export const qstashReceiver =
  currentSigningKey && nextSigningKey
    ? new Receiver({
        currentSigningKey,
        nextSigningKey,
      })
    : null;

export function importWorkerUrl() {
  if (process.env.QSTASH_URL?.trim()) return process.env.QSTASH_URL.trim();
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api/import-worker`;
  return null;
}
