import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact & removals",
  description:
    "Reach the operator of PLACARD to request a removal, correction, or dispute, to report a rule breach, or to raise a security issue. No email address required.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ report?: string }> }) {
  const { report = "" } = await searchParams;
  return <ContactForm initialReportId={report} />;
}
