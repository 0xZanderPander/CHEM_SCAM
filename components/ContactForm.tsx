"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { RequestCategory } from "@/db/schema";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

const categories: Array<{ value: RequestCategory; label: string; hint: string }> = [
  { value: "removal", label: "Removal request", hint: "Ask for a report or comment to be taken down." },
  { value: "correction", label: "Correction", hint: "A detail in a report is wrong and should be fixed." },
  { value: "dispute", label: "Dispute a report", hint: "You are the subject and you contest the allegation." },
  { value: "conduct", label: "Report a rule breach", hint: "Doxxing, threats, spam, or other prohibited content." },
  { value: "security", label: "Security issue", hint: "A vulnerability or abuse of the site itself." },
  { value: "general", label: "Something else", hint: "Anything not covered above." },
];

export function ContactForm({ initialReportId = "" }: { initialReportId?: string }) {
  const [startedAt, setStartedAt] = useState(0);
  const [form, setForm] = useState({
    category: (initialReportId ? "dispute" : "general") as RequestCategory,
    reportId: initialReportId,
    contactInfo: "",
    message: "",
    company: "",
  });
  const [notice, setNotice] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = categories.find((item) => item.value === form.category);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/disputes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, startedAt }),
      });
      const data = (await response.json()) as { error?: string };
      if (response.ok) {
        setSent(true);
        setNotice("Your message has been added to the moderation queue.");
        setForm((current) => ({ ...current, contactInfo: "", message: "", company: "" }));
      } else setNotice(data.error || "Your message could not be submitted.");
    } catch {
      setNotice("Your message could not be submitted. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <main className="min-h-screen">
      <SiteHeader compact />

      <div className="page-shell py-10">
        <div className="doc-panel">
          <p className="eyebrow text-[#6b6558]">Contact the operator</p>
          <h1 className="font-display mt-3 text-4xl font-black leading-none text-[#171412]">Contact &amp; removals</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#45403b]">
            This form is the only way to reach the operator. There is no public email address — by design, so that
            neither side of a dispute has to expose an identity to start one. Messages go to a private moderation queue
            that only the operator can read.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <section className="doc-panel">
            <form className="grid gap-6" onSubmit={submit}>
              <fieldset className="grid gap-3 border-0 p-0">
                <legend className="field-label mb-1">What is this about? *</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {categories.map((item) => (
                    <label
                      key={item.value}
                      className={`flex cursor-pointer items-start gap-2.5 border-2 p-3 transition-colors ${
                        form.category === item.value ? "border-[#171412] bg-[#fffaeb]" : "border-[#d8d3c8] bg-white hover:border-[#6b6558]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        className="mt-0.5"
                        value={item.value}
                        checked={form.category === item.value}
                        onChange={() => setForm({ ...form, category: item.value })}
                      />
                      <span>
                        <span className="font-display block text-[13px] font-bold text-[#171412]">{item.label}</span>
                        <span className="mt-0.5 block text-[12px] leading-5 text-[#6b6558]">{item.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label>
                <span className="field-label">
                  Report reference <span className="font-normal text-[#6b6558]">(optional)</span>
                </span>
                <input
                  className="field-input font-data mt-2 w-full"
                  value={form.reportId}
                  onChange={(event) => setForm({ ...form, reportId: event.target.value })}
                  maxLength={100}
                  placeholder="Paste the ID from the report page"
                />
                <span className="mt-1.5 block text-[12px] leading-5 text-[#6b6558]">
                  Opening this form from a report pre-fills this. Without it, a removal or correction request is much
                  harder to act on.
                </span>
              </label>

              <label>
                <span className="field-label">
                  How should we reply? <span className="font-normal text-[#6b6558]">(optional)</span>
                </span>
                <input
                  className="field-input mt-2 w-full"
                  value={form.contactInfo}
                  onChange={(event) => setForm({ ...form, contactInfo: event.target.value })}
                  maxLength={300}
                  placeholder="Email, Signal handle, Session ID, or another channel"
                />
                <span className="mt-1.5 block text-[12px] leading-5 text-[#6b6558]">
                  Leave this blank to stay fully anonymous — your request is still read and acted on, you just will not
                  get a reply. Whatever you enter is visible only to the operator.
                </span>
              </label>

              <label>
                <span className="field-label">Message *</span>
                <textarea
                  className="field-input mt-2 min-h-44 w-full resize-y"
                  value={form.message}
                  onFocus={() => !startedAt && setStartedAt(Date.now())}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                  maxLength={4000}
                  required
                  placeholder="Explain what should be reviewed and why. Be specific — what is wrong, and what supports that."
                />
              </label>

              <label className="absolute left-[-10000px]" aria-hidden="true">
                Company
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.company}
                  onChange={(event) => setForm({ ...form, company: event.target.value })}
                />
              </label>

              {notice && (
                <p className={`border-l-[6px] py-2 pl-3 text-sm font-bold ${sent ? "border-[#ffc400] bg-[#fffaeb]" : "border-[#dc2626] bg-[#fef2f2] text-[#b91c1c]"}`} role="status">
                  {notice}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <button className="button-primary" disabled={busy}>
                  {busy ? "Submitting…" : "Send to moderation queue"}
                </button>
                <Link href="/" className="font-display text-[13px] text-[#6b6558] hover:text-[#171412]">
                  ← Back to the board
                </Link>
              </div>
            </form>
          </section>

          <aside className="grid gap-4 lg:sticky lg:top-8">
            <div className="doc-callout">
              <p className="font-display text-[13px] font-bold text-[#171412]">Selected: {active?.label}</p>
              <p className="mt-1.5 text-[13px] leading-6 text-[#45403b]">{active?.hint}</p>
            </div>

            <div className="border-2 border-[#d8d3c8] bg-white p-4 text-[13px] leading-6 text-[#45403b]">
              <p className="font-display mb-2 text-[13px] font-bold text-[#171412]">Before you send</p>
              <ul className="grid gap-2 pl-4 [list-style:square]">
                <li>
                  Read the <Link href="/policy#removal" className="text-[#b34700] underline">removal policy</Link> — it
                  lists exactly what is weighed.
                </li>
                <li>
                  Contested-but-plausible reports are normally marked{" "}
                  <Link href="/policy#dispute" className="text-[#b34700] underline">Disputed</Link> rather than deleted.
                </li>
                <li>Doxxing, threats, and unlawful content are removed on sight — say so and it will be prioritised.</li>
                <li>Do not include personal information that is not needed to explain your request.</li>
              </ul>
            </div>

            <div className="border-2 border-[#d8d3c8] bg-white p-4 text-[13px] leading-6 text-[#45403b]">
              <p className="font-display mb-2 text-[13px] font-bold text-[#171412]">What this is not</p>
              <p>
                A good-faith moderation channel run by one person. It is not a formal legal-notice intake system and
                carries no guaranteed response time. Submissions are rate limited.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
