import type { ReportStatus } from "@/db/schema";

export function calculatedStatus(confirmations: number, duplicates: number): ReportStatus {
  if (duplicates >= 2) return "Repeatedly Reported";
  if (confirmations >= 3) return "Community Confirmed";
  return "Unverified";
}

export function automaticStatus(current: ReportStatus, confirmations: number, duplicates: number): ReportStatus {
  return current === "Disputed" ? "Disputed" : calculatedStatus(confirmations, duplicates);
}
