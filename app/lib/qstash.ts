import { Client, Receiver } from "@upstash/qstash";

export const qstash = process.env.QSTASH_TOKEN ? new Client({ token: process.env.QSTASH_TOKEN }) : null;
export const qstashReceiver = process.env.QSTASH_CURRENT_SIGNING_KEY
  ? new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    })
  : null;

export function importWorkerUrl() {
  if (process.env.QSTASH_IMPORT_URL) return process.env.QSTASH_IMPORT_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api/import-worker`;
  return null;
}
