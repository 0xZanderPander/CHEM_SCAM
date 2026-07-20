import { redirect } from "next/navigation";

// The dispute form was folded into the general contact page. This redirect is
// kept because published reports, documentation, and external links still point
// at /dispute; it preserves the pre-filled report reference.
export default async function Page({ searchParams }: { searchParams: Promise<{ report?: string }> }) {
  const { report = "" } = await searchParams;
  redirect(report ? `/contact?report=${encodeURIComponent(report)}` : "/contact");
}
