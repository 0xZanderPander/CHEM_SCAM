"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Report, ReportStatus } from "@/db";
import { randomNickname } from "@/lib/names";
import { NicknameField } from "./NicknameField";
import { ReportCard } from "./ReportCard";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

const filters: Array<"All Reports" | ReportStatus> = ["All Reports", "Repeatedly Reported", "Community Confirmed", "Unverified", "Disputed"];

export function HomePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof filters)[number]>("All Reports");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ scammerName: "", website: "", description: "", nickname: "Suspicious Potato", company: "", startedAt: 0 });

  const loadReports = useCallback(async () => {
    const response = await fetch("/api/reports", { cache: "no-store" });
    const data = (await response.json()) as { reports?: Report[] };
    setReports(data.reports ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetch("/api/reports", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ reports?: Report[] }>)
      .then((data) => { setReports(data.reports ?? []); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch = !term || report.scammer_name.toLowerCase().includes(term) || report.domain?.toLowerCase().includes(term);
      const matchesStatus = status === "All Reports" || report.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [query, reports, status]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");
    const response = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const data = (await response.json()) as { error?: string; duplicate?: boolean; pendingReview?: boolean; possibleMatch?: string | null };
    if (!response.ok) setNotice(data.error ?? "We could not submit this report.");
    else {
      setNotice(data.pendingReview ? "Report received for moderator review." : data.duplicate ? "Matched an existing domain and attached as a supporting report." : data.possibleMatch ? "Report published and flagged as a possible duplicate for moderator review." : "Report published anonymously.");
      setForm({ scammerName: "", website: "", description: "", nickname: randomNickname(), company: "", startedAt: 0 });
      await loadReports();
      window.setTimeout(() => setOpen(false), 900);
    }
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen">
      <SiteHeader action={<button className="button-yellow" onClick={() => { setForm((current) => ({ ...current, startedAt: Date.now() })); setOpen(true); }}>+ File a report</button>} />

      <div className="border-b border-[#d8d3c8] bg-white">
        <div className="page-shell flex items-start gap-2.5 py-3 text-[13px] text-[#45403b]"><span aria-hidden="true">△</span><p><b>Community-submitted, unverified.</b> Allegations, not confirmed facts. <a href="/about#how-it-works" className="underline underline-offset-2 hover:text-[#e8590c]">How this works</a> · <a href="/contact" className="underline underline-offset-2 hover:text-[#e8590c]">Request a removal</a></p></div>
      </div>

      <section className="page-shell py-8">
        <label className="relative block"><span className="sr-only">Search scammer name or domain</span><input className="field-input w-full pl-11" placeholder="Search by scammer name or domain…" value={query} onChange={(event) => setQuery(event.target.value)} /><span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b6558]" aria-hidden="true">⌕</span></label>
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((filter) => <button key={filter} className={`filter-button ${status === filter ? "filter-active" : ""}`} onClick={() => setStatus(filter)}>{filter}</button>)}
        </div>

        <div className="mt-7 grid gap-4">
          {loading ? <div className="empty-card">Loading community reports…</div> : filtered.length ? filtered.map((report) => <ReportCard key={report.id} report={report} onConfirmed={loadReports} />) : (
            <div className="empty-card"><span className="text-3xl">◇</span><h2 className="font-display mt-3 text-xl font-bold">{query || status !== "All Reports" ? "No matching reports" : "No reports filed yet"}</h2><p className="mt-2 text-sm text-[#6b6558]">{query || status !== "All Reports" ? "Try another search or status." : "Be the first to add a good-faith community report."}</p>{!query && status === "All Reports" && <button className="button-primary mt-5" onClick={() => { setForm((current) => ({ ...current, startedAt: Date.now() })); setOpen(true); }}>File the first report</button>}</div>
          )}
        </div>
      </section>

      <SiteFooter />

      {open && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <div className="hazard-stripe" />
            <div className="p-6">
              <div className="flex items-start justify-between gap-5"><div><h2 id="report-title" className="font-display text-2xl font-bold">File a report</h2><p className="mt-1 text-[13px] text-[#6b6558]">No account needed. Your submission is anonymous.</p></div><button className="close-button" onClick={() => setOpen(false)} aria-label="Close report form">×</button></div>
              <form className="mt-6 grid gap-4" onSubmit={submit}>
                <label><span className="field-label">Scammer / website name *</span><input className="field-input mt-2 w-full" required maxLength={120} value={form.scammerName} onChange={(e) => setForm({ ...form, scammerName: e.target.value })} placeholder="e.g. ReagentSource Direct" /></label>
                <label><span className="field-label">Website URL <span className="font-normal text-[#6b6558]">(optional)</span></span><input className="field-input font-data mt-2 w-full" inputMode="url" maxLength={500} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="example.com" /></label>
                <label><span className="field-label">What happened? *</span><textarea className="field-input mt-2 min-h-28 w-full resize-y" required maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe what happened—be specific but factual." /></label>
                <div className="border-2 border-[#d8d3c8] p-4"><NicknameField value={form.nickname} onChange={(nickname) => setForm({ ...form, nickname })} /></div>
                <label className="absolute left-[-10000px]" aria-hidden="true">Company<input tabIndex={-1} autoComplete="off" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></label>
                {notice && <p className="text-sm font-bold" role="status">{notice}</p>}
                <button className="button-primary justify-center py-3" disabled={submitting}>{submitting ? "Submitting…" : "Submit report"}</button>
                <p className="text-center text-[11px] leading-5 text-[#6b6558]">Submitting means good faith and agreeing to the <a href="/about#terms" className="underline underline-offset-2">terms</a> and <a href="/about#guidelines" className="underline underline-offset-2">guidelines</a>. No personal information about anyone.</p>
              </form>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
