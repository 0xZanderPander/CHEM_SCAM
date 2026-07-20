import { DisputeForm } from "@/components/DisputeForm";

export default async function Page({ searchParams }: { searchParams: Promise<{ report?: string }> }) {
  const { report = "" } = await searchParams;
  return <DisputeForm initialReportId={report} />;
}

