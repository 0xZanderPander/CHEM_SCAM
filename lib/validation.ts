export const limits = {
  scammerName: 120,
  website: 500,
  description: 2_000,
  nickname: 50,
  comment: 1_000,
  disputeMessage: 4_000,
  contactInfo: 300,
};

export class PublicInputError extends Error {}

export function cleanText(value: unknown, maximum: number, field: string, required = true) {
  const text = String(value ?? "").trim();
  if (required && !text) throw new PublicInputError(`${field} is required.`);
  if (text.length > maximum) throw new PublicInputError(`${field} is too long.`);
  if (/\u0000/.test(text)) throw new PublicInputError(`${field} contains invalid characters.`);
  return text;
}

export function normalizedDomain(value?: string | null) {
  if (!value?.trim()) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const parsed = new URL(withProtocol);
    if (!(["http:", "https:"] as string[]).includes(parsed.protocol)) return null;
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function safeWebsite(value: unknown) {
  const website = cleanText(value, limits.website, "Website", false);
  if (!website) return { website: null, normalizedDomain: null };
  const normalized = normalizedDomain(website);
  if (!normalized) throw new PublicInputError("Please enter a valid HTTP or HTTPS website address.");
  const parsed = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
  if (!(["http:", "https:"] as string[]).includes(parsed.protocol)) throw new PublicInputError("Only HTTP and HTTPS website links are allowed.");
  if (parsed.username || parsed.password) throw new PublicInputError("Website links cannot include embedded credentials.");
  return { website: parsed.toString(), normalizedDomain: normalized };
}

export function normalizedName(value: string) {
  return value.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const sensitivePatterns = [
  { reason: "possible email address", expression: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { reason: "possible phone number", expression: /(?:\+?\d[\s().-]*){9,}/ },
  { reason: "possible payment-card number", expression: /\b(?:\d[ -]*?){13,19}\b/ },
  { reason: "possible home address", expression: /\b\d{1,5}\s+[A-Za-z0-9.' -]{2,40}\s(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd)\b/i },
  { reason: "possible threat", expression: /\b(?:kill|hurt|attack|shoot|bomb|burn down|find where .* lives)\b/i },
];

export function screenSensitiveContent(...values: string[]) {
  const combined = values.join("\n");
  return sensitivePatterns.filter(({ expression }) => expression.test(combined)).map(({ reason }) => reason);
}

export function validateBotFields(body: Record<string, unknown>, minimumMs = Number(process.env.MIN_SUBMISSION_TIME_MS || 1_500)) {
  if (String(body.company ?? "").trim()) throw new PublicInputError("Submission could not be accepted.");
  const startedAt = Number(body.startedAt);
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < minimumMs) throw new PublicInputError("Please take a moment to review your submission.");
}

export async function readJsonBody(request: Request, maxBytes = 32_768) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new PublicInputError("Request is too large.");
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new PublicInputError("Request is too large.");
  try {
    return JSON.parse(text || "{}") as Record<string, unknown>;
  } catch {
    throw new PublicInputError("Invalid request.");
  }
}
