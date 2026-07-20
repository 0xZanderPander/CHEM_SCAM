"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Comment, DuplicateReport, Report } from "@/db";
import { randomNickname } from "@/lib/names";
import { publicWebsiteHref } from "@/lib/urls";
import { Brand } from "./Brand";
import { NicknameField } from "./NicknameField";

type DetailData = { report: Report; duplicates: DuplicateReport[]; comments: Comment[] };

const detailStatusTone: Record<Report["status"], string> = {
  Unverified: "status-unverified",
  "Community Confirmed": "status-confirmed",
  "Repeatedly Reported": "status-repeated",
  Disputed: "status-disputed",
};

export function ReportDetail({ id }: { id: string }) {
  const [data, setData] = useState<DetailData | null>(null);
  const [error, setError] = useState("");
  const [discussionOpen, setDiscussionOpen] = useState(true);
  const [form, setForm] = useState({ nickname: "Suspicious Potato", comment: "", company: "", startedAt: 0 });
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/reports/${id}`, { cache: "no-store" });
    if (!response.ok) {
      setError("This report could not be found.");
      return;
    }
    setData((await response.json()) as DetailData);
  }, [id]);

  useEffect(() => {
    void fetch(`/api/reports/${id}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) { setError("This report could not be found."); return; }
      setData((await response.json()) as DetailData);
    });
  }, [id]);

  async function addComment(event: FormEvent) {
    event.preventDefault();
    setNotice("");
    const response = await fetch(`/api/reports/${id}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (response.ok) {
      const result = (await response.json()) as { pendingReview?: boolean };
      setForm({ nickname: randomNickname(), comment: "", company: "", startedAt: Date.now() });
      setNotice(result.pendingReview ? "Comment received for moderator review." : "Comment added.");
      await load();
    } else {
      const result = (await response.json()) as { error?: string };
      setNotice(result.error ?? "Could not add comment.");
    }
  }

  async function flagComment(commentId: string) {
    const key = "placard-browser-token";
    let browserToken = localStorage.getItem(key);
    if (!browserToken) { browserToken = crypto.randomUUID(); localStorage.setItem(key, browserToken); }
    const response = await fetch(`/api/comments/${commentId}/flag`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ browserToken }) });
    const result = (await response.json()) as { error?: string };
    setNotice(response.ok ? "Comment reported for moderator review." : result.error || "Comment could not be reported.");
  }

  if (error) return <div className="page-shell py-20"><Brand /><p className="mt-12 text-xl font-bold">{error}</p><Link href="/" className="button-secondary mt-5">Back to reports</Link></div>;
  if (!data) return <div className="page-shell py-20">Loading report…</div>;

  const { report, duplicates, comments } = data;
  const websiteHref = publicWebsiteHref(report.website);
  return (
    <main className="min-h-screen pb-16">
      <header className="bg-[#171412] text-white">
        <div className="page-shell flex items-center justify-between py-5">
          <Brand compact />
          <Link href="/" className="button-secondary">← All reports</Link>
        </div>
        <div className="hazard-stripe" />
      </header>
      <div className="page-shell py-8 sm:py-12">
        <div className="grid gap-7 lg:grid-cols-[1fr_280px]">
          <div>
            <article className="border-2 border-[#d8d3c8] bg-white p-6 sm:p-9">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`status-pill ${detailStatusTone[report.status]}`}>{report.status}</span>
                <span className="text-xs text-neutral-500">Posted {new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(report.created_at))}</span>
              </div>
              <h1 className="mt-6 text-3xl font-black tracking-[-0.045em] sm:text-5xl">{report.scammer_name}</h1>
              {report.domain && websiteHref && <a className="mt-2 inline-block font-bold text-neutral-500 hover:text-neutral-950" href={websiteHref} target="_blank" rel="noreferrer nofollow">{report.domain} ↗</a>}
              <p className="mt-8 whitespace-pre-wrap text-base leading-8 text-neutral-700">{report.description}</p>
              <div className="mt-8 border-t border-neutral-200 pt-5 text-sm text-neutral-500">Submitted anonymously by <b className="text-neutral-800">{report.nickname}</b></div>
            </article>

            {duplicates.length > 0 && (
              <section className="mt-7 border-2 border-[#d8d3c8] bg-white p-6 sm:p-8">
                <p className="eyebrow text-neutral-500">Related submissions</p>
                <h2 className="mt-2 text-xl font-extrabold">{duplicates.length} duplicate {duplicates.length === 1 ? "report" : "reports"}</h2>
                <div className="mt-5 divide-y divide-neutral-200">
                  {duplicates.map((duplicate) => (
                    <article key={duplicate.id} className="py-5 first:pt-0 last:pb-0">
                      <p className="leading-7 text-neutral-700">{duplicate.description}</p>
                      <p className="mt-3 text-xs text-neutral-500"><b className="text-neutral-700">{duplicate.nickname}</b> · {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(duplicate.created_at))}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-7 border-2 border-[#d8d3c8] bg-white">
              <button className="flex w-full items-center justify-between p-6 text-left sm:p-8" onClick={() => setDiscussionOpen((current) => !current)} aria-expanded={discussionOpen}>
                <span><span className="eyebrow text-neutral-500">Community discussion</span><span className="mt-2 block text-xl font-extrabold">{comments.length} {comments.length === 1 ? "comment" : "comments"}</span></span>
                <span className="text-2xl" aria-hidden="true">{discussionOpen ? "−" : "+"}</span>
              </button>
              {discussionOpen && (
                <div className="border-t border-neutral-200 p-6 sm:p-8">
                  <div className="divide-y divide-neutral-200">
                    {comments.length ? comments.map((comment) => (
                      <article key={comment.id} className="py-5 first:pt-0">
                        <div className="flex items-center justify-between gap-4"><p className="text-sm font-extrabold">{comment.nickname}</p><time className="text-xs text-neutral-400">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(comment.created_at))}</time></div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-neutral-700">{comment.comment}</p>
                        <button className="mt-2 text-xs text-neutral-400 underline hover:text-red-700" onClick={() => flagComment(comment.id)}>Report comment{comment.flag_count ? ` (${comment.flag_count})` : ""}</button>
                      </article>
                    )) : <p className="pb-6 text-sm text-neutral-500">No comments yet. Add useful context or a factual update.</p>}
                  </div>
                  <form className="mt-6 grid gap-4 rounded-xl bg-neutral-100 p-5" onSubmit={addComment}>
                    <h3 className="font-extrabold">Join anonymously</h3>
                    <NicknameField value={form.nickname} onChange={(nickname) => setForm({ ...form, nickname })} />
                    <label><span className="field-label">Comment</span><textarea className="field-input mt-2 min-h-24 w-full" required maxLength={1000} value={form.comment} onFocus={() => !form.startedAt && setForm({ ...form, startedAt: Date.now() })} onChange={(event) => setForm({ ...form, comment: event.target.value })} placeholder="Add context, evidence, or a respectful correction." /></label>
                    <label className="absolute left-[-10000px]" aria-hidden="true">Company<input tabIndex={-1} autoComplete="off" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></label>
                    {notice && <p className="text-xs font-bold" role="status">{notice}</p>}
                    <button className="button-primary w-fit">Post comment</button>
                  </form>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5">
            <div className="rounded-xl border-2 border-neutral-950 bg-[#f7d34a] p-5 shadow-[4px_4px_0_#171717]">
              <p className="eyebrow">Community signal</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="bg-white p-4"><b className="block text-2xl">{report.confirmations}</b><span className="text-xs text-neutral-500">Confirmations</span></div>
                <div className="bg-white p-4"><b className="block text-2xl">{report.duplicate_count}</b><span className="text-xs text-neutral-500">Duplicates</span></div>
              </div>
            </div>
            <div className="border-2 border-[#d8d3c8] bg-white p-5 text-xs leading-6 text-neutral-600">
              <p className="font-extrabold text-neutral-950">Important context</p>
              <p className="mt-2">This is an allegation submitted by community members, not a verified finding. Review the details and make your own assessment.</p>
              <Link href={`/contact?report=${encodeURIComponent(report.id)}`} className="mt-4 inline-block font-bold underline underline-offset-4">Request correction / dispute this listing</Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
