import type { DisputeResolutionType } from "@/db/schema";

export const disputeResolutionTypes: DisputeResolutionType[] = [
  "no_action",
  "report_marked_disputed",
  "report_removed",
  "report_corrected",
  "other",
];

export function boundedPage(value: string | null) {
  const parsed = Number(value || 1);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 1_000_000) : 1;
}

export function boundedPageSize(value: string | null) {
  const parsed = Number(value || 50);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : 50;
}

export function summarizeModerationMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const record = metadata as Record<string, unknown>;
  const allowed = ["resolutionType", "status", "note", "targetId", "reportId", "possibleDuplicateOf", "reasons"];
  const parts = allowed.flatMap((key) => {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return [`${key}: ${value.replace(/\s+/g, " ").trim().slice(0, 160)}`];
    if (Array.isArray(value)) {
      const safe = value.filter((item): item is string => typeof item === "string").join(", ").slice(0, 160);
      return safe ? [`${key}: ${safe}`] : [];
    }
    return [];
  });
  return parts.join(" · ").slice(0, 400) || null;
}
