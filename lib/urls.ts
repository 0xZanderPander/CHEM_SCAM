export function publicWebsiteHref(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && !parsed.username && !parsed.password ? parsed.toString() : null;
  } catch {
    return null;
  }
}
