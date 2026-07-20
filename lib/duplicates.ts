import { normalizedName } from "./validation";

export type DuplicateCandidate = {
  id: string;
  scammer_name: string;
  normalized_domain: string | null;
};

export function findDuplicateCandidates(reports: DuplicateCandidate[], scammerName: string, domain: string | null) {
  const domainMatch = domain ? reports.find((report) => report.normalized_domain === domain) : undefined;
  const nameMatch = reports.find((report) => normalizedName(report.scammer_name) === normalizedName(scammerName));
  return { domainMatch, nameMatch };
}
