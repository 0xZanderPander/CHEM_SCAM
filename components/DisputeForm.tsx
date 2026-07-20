"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Brand } from "./Brand";

export function DisputeForm({ initialReportId = "" }: { initialReportId?: string }) {
  const [startedAt, setStartedAt] = useState(0);
  const [form, setForm] = useState({ reportId: initialReportId, contactInfo: "", message: "", company: "" });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    const response = await fetch("/api/disputes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, startedAt }),
    });
    const data = (await response.json()) as { error?: string };
    if (response.ok) {
      setNotice("Your request has been added to the moderation queue.");
      setForm((current) => ({ ...current, contactInfo: "", message: "", company: "" }));
    } else setNotice(data.error || "Request could not be submitted.");
    setBusy(false);
  }

  return (
    <main className="min-h-screen">
      <header className="bg-[#171412] text-white"><div className="page-shell flex items-center justify-between py-5"><Brand compact /><Link href="/" className="button-secondary">← Public board</Link></div><div className="hazard-stripe" /></header>
      <div className="page-shell max-w-3xl py-10">
        <section className="border-2 border-[#d8d3c8] bg-white p-6 sm:p-9">
          <p className="eyebrow text-[#6b6558]">Moderation request</p>
          <h1 className="font-display mt-3 text-3xl font-black">Request a correction or dispute</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#45403b]">Use this form to request review, correction, or removal. It enters the site’s moderation queue; it is not a formal legal-notice intake system.</p>
          <form className="mt-7 grid gap-5" onSubmit={submit}>
            <label><span className="field-label">Report reference <span className="font-normal">(optional)</span></span><input className="field-input font-data mt-2 w-full" value={form.reportId} onChange={(event) => setForm({ ...form, reportId: event.target.value })} maxLength={100} /></label>
            <label><span className="field-label">Contact information <span className="font-normal">(optional)</span></span><input className="field-input mt-2 w-full" value={form.contactInfo} onChange={(event) => setForm({ ...form, contactInfo: event.target.value })} maxLength={300} placeholder="Email, Signal handle, Session ID, or another method" /></label>
            <label><span className="field-label">Message *</span><textarea className="field-input mt-2 min-h-40 w-full" value={form.message} onFocus={() => !startedAt && setStartedAt(Date.now())} onChange={(event) => setForm({ ...form, message: event.target.value })} maxLength={4000} required placeholder="Explain what should be reviewed and why." /></label>
            <label className="absolute left-[-10000px]" aria-hidden="true">Company<input tabIndex={-1} autoComplete="off" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></label>
            {notice && <p className="text-sm font-bold" role="status">{notice}</p>}
            <button className="button-primary w-fit" disabled={busy}>{busy ? "Submitting…" : "Submit moderation request"}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
