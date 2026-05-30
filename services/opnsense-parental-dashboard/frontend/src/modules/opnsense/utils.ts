import type { Preflight } from "./types";

export function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
}

export function countOkChecks(preflight: Preflight | null): number {
  if (!preflight?.checks) return 0;
  return Object.values(preflight.checks).filter((v) => Boolean(v?.ok)).length;
}

export function countAllChecks(preflight: Preflight | null): number {
  return preflight?.checks ? Object.keys(preflight.checks).length : 0;
}

export function extractRuntimeRows(
  payload: unknown,
): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") return [];
  const result = (
    payload as { result?: { rows?: Array<Record<string, unknown>> } }
  ).result;
  return Array.isArray(result?.rows) ? result.rows : [];
}
