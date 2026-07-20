"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Comment, DisputeResolutionType, Report, ReportStatus } from "@/db";
import { Brand } from "./Brand";

type DisputeRequest = { id: string; report_id: string | null; contact_info: string | null; message: string; created_at: string };
type SupportingAccount = { id: string; report_id: string; nickname: string; description: string; website: string | null; created_at: string; publication_state: string };
type MergeTarget = { id: string; scammer_name: string };
type ModerationEvent = { id: string; action: string; target_type: string; target_id: string; created_at: string; metadata_summary: string | null };
type Pagination = { reportPage: number; reportTotal: number; commentPage: number; commentTotal: number; pageSize: number; reportFilter: string; commentFilter: string };
type AdminData = {
  reports: Report[];
  comments: Comment[];
  disputes: DisputeRequest[];
  supportingAccounts: SupportingAccount[];
  mergeTargets: MergeTarget[];
  moderationEvents: ModerationEvent[];
  pagination: Pagination;
};

type ModerateExtra = {
  targetId?: string;
  status?: ReportStatus;
  note?: string;
  resolutionType?: DisputeResolutionType;
};

const emptyData: AdminData = {
  reports: [], comments: [], disputes: [], supportingAccounts: [], mergeTargets: [], moderationEvents: [],
  pagination: { reportPage: 1, reportTotal: 0, commentPage: 1, commentTotal: 0, pageSize: 50, reportFilter: "all", commentFilter: "all" },
};

function csrfToken() {
  return document.cookie.split("; ").find((item) => item.startsWith("placard_csrf="))?.split("=").slice(1).join("=") || "";
}

function DisputeResolution({ request, resolve }: { request: DisputeRequest; resolve: (type: DisputeResolutionType, note: string) => Promise<void> }) {
  const [type, setType] = useState<DisputeResolutionType>("no_action");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!note.trim()) return;
    setBusy(true);
    await resolve(type, note);
    setBusy(false);
  }

  return (
    <div className="mt-4 grid gap-3 border-t border-neutral-200 pt-4">
      <label><span className="field-label">Resolution</span><select className="field-input mt-2 w-full" value={type} onChange={(event) => setType(event.target.value as DisputeResolutionType)}><option value="no_action">No action</option><option value="report_marked_disputed" disabled={!request.report_id}>Report marked disputed</option><option value="report_removed" disabled={!request.report_id}>Report removed</option><option value="report_corrected">Report corrected</option><option value="other">Other</option></select></label>
      <label><span className="field-label">Resolution note *</span><textarea className="field-input mt-2 min-h-20 w-full" maxLength={1000} required value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record what was reviewed and why this resolution was chosen." /></label>
      <button className="button-primary w-fit" disabled={busy || !note.trim()} onClick={submit}>{busy ? "Resolving…" : "Resolve request"}</button>
    </div>
  );
}

function Pager({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="mt-4 flex items-center gap-3 text-xs text-neutral-500"><button className="button-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><span>Page {page} of {pages} · {total} items</span><button className="button-secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button></div>;
}

export function AdminPanel() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [data, setData] = useState<AdminData>(emptyData);
  const [notice, setNotice] = useState("");
  const [reportPage, setReportPage] = useState(1);
  const [commentPage, setCommentPage] = useState(1);
  const [reportFilter, setReportFilter] = useState("all");
  const [commentFilter, setCommentFilter] = useState("all");

  const adminUrl = useMemo(() => {
    const search = new URLSearchParams({ reportPage: String(reportPage), commentPage: String(commentPage), reportFilter, commentFilter, pageSize: "50" });
    return `/api/admin/moderate?${search}`;
  }, [commentFilter, commentPage, reportFilter, reportPage]);

  const load = useCallback(async () => {
    const response = await fetch(adminUrl, { cache: "no-store" });
    if (!response.ok) { setAuthorized(false); return; }
    setData((await response.json()) as AdminData);
    setAuthorized(true);
  }, [adminUrl]);

  useEffect(() => {
    void fetch(adminUrl, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      setData((await response.json()) as AdminData);
      setAuthorized(true);
    });
  }, [adminUrl]);

  async function login(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) { setNotice(result.error || "Could not sign in."); return; }
    setPassword("");
    setNotice("");
    await load();
  }

  async function moderate(action: string, id: string, extra: ModerateExtra = {}) {
    const response = await fetch("/api/admin/moderate", {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": csrfToken() },
      body: JSON.stringify({ action, id, ...extra }),
    });
    const result = (await response.json()) as { error?: string };
    setNotice(response.ok ? "Moderation action completed." : result.error || "Action failed.");
    if (response.ok) await load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", headers: { "x-csrf-token": csrfToken() } });
    setAuthorized(false);
    setData(emptyData);
  }

  return (
    <main className="min-h-screen">
      <header className="bg-[#171412] text-white"><div className="page-shell flex items-center justify-between gap-3 py-5"><Brand compact /><div className="flex gap-2"><Link href="/" className="button-secondary">← Public board</Link>{authorized && <button className="button-secondary" onClick={logout}>Log out</button>}</div></div><div className="hazard-stripe" /></header>
      <div className="page-shell py-10">
        <p className="eyebrow text-neutral-500">Private workspace</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Moderation</h1>
        {!authorized ? (
          <form className="mt-8 max-w-md border-2 border-[#d8d3c8] bg-white p-6" onSubmit={login}>
            <label><span className="field-label">Admin password</span><input className="field-input mt-2 w-full" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {notice && <p className="mt-3 text-sm font-semibold text-red-700">{notice}</p>}
            <button className="button-primary mt-5">Open moderation</button>
          </form>
        ) : (
          <div className="mt-8 grid gap-9">
            {notice && <p className="border-2 border-[#171412] bg-white px-4 py-3 text-sm font-bold" role="status">{notice}</p>}

            <section>
              <h2 className="font-display text-xl font-extrabold">Correction / dispute requests ({data.disputes.length})</h2>
              <div className="mt-4 grid gap-3">
                {data.disputes.length ? data.disputes.map((request) => (
                  <article className="border-2 border-[#e8590c] bg-white p-5" key={request.id}>
                    <p className="text-sm leading-7">{request.message}</p>
                    <p className="font-data mt-2 text-xs text-neutral-500">Report: {request.report_id || "Not supplied"} · Contact: {request.contact_info || "Not supplied"}</p>
                    {request.report_id && <Link href={`/reports/${request.report_id}`} className="button-secondary mt-4">View report</Link>}
                    <DisputeResolution request={request} resolve={(resolutionType, note) => moderate("resolve-dispute", request.id, { resolutionType, note })} />
                  </article>
                )) : <p className="text-sm text-neutral-500">No open correction requests.</p>}
              </div>
            </section>

            <section><h2 className="font-display text-xl font-extrabold">Supporting accounts ({data.supportingAccounts.length}, newest 50)</h2><div className="mt-4 grid gap-3">{data.supportingAccounts.length ? data.supportingAccounts.map((item) => <article className={`border-2 bg-white p-5 ${item.publication_state === "pending_review" ? "border-[#e8590c]" : "border-[#d8d3c8]"}`} key={item.id}><p className="text-sm leading-7">{item.description}</p><p className="font-data mt-2 text-xs text-neutral-500">By {item.nickname} · Parent {item.report_id} · {item.publication_state}</p><div className="mt-4 flex gap-2">{item.publication_state === "pending_review" && <button className="button-primary" onClick={() => moderate("publish-duplicate", item.id)}>Publish account</button>}<button className="button-danger" onClick={() => window.confirm(item.publication_state === "pending_review" ? "Reject this supporting account?" : "Remove this supporting account?") && moderate("remove-duplicate", item.id)}>{item.publication_state === "pending_review" ? "Reject" : "Remove"}</button></div></article>) : <p className="text-sm text-neutral-500">No active supporting accounts.</p>}</div></section>

            <section>
              <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-extrabold">Reports ({data.pagination.reportTotal})</h2><select className="field-input" value={reportFilter} onChange={(event) => { setReportFilter(event.target.value); setReportPage(1); }}><option value="all">All reports</option><option value="pending">Pending review</option><option value="disputed">Disputed</option><option value="possible_duplicates">Possible duplicates</option></select></div>
              <div className="mt-4 grid gap-3">
                {data.reports.map((report) => (
                  <article className={`border-2 bg-white p-5 ${report.publication_state === "pending_review" || report.possible_duplicate_of ? "border-[#e8590c]" : "border-[#d8d3c8]"}`} key={report.id}>
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div><p className="font-extrabold">{report.scammer_name}</p><p className="font-data mt-1 text-xs text-neutral-500">{report.status} · {report.domain || "No domain"} · {report.publication_state}{report.possible_duplicate_of ? ` · possible match: ${report.possible_duplicate_of}` : ""}</p></div>
                      <div className="flex flex-wrap gap-2">
                        {report.publication_state === "pending_review" && <button className="button-primary" onClick={() => moderate("publish-report", report.id)}>Publish</button>}
                        <select className="field-input" value={report.status} onChange={(event) => moderate("set-status", report.id, { status: event.target.value as ReportStatus })} aria-label={`Status for ${report.scammer_name}`}><option>Unverified</option><option>Community Confirmed</option><option>Repeatedly Reported</option><option>Disputed</option></select>
                        <select className="field-input" defaultValue="" onChange={(event) => event.target.value && moderate("merge", report.id, { targetId: event.target.value })} aria-label={`Merge ${report.scammer_name} into another report`}><option value="">Merge into…</option>{data.mergeTargets.filter((target) => target.id !== report.id).map((target) => <option key={target.id} value={target.id}>{target.scammer_name}</option>)}</select>
                        <button className="button-danger" onClick={() => window.confirm("Remove this report?") && moderate("remove-report", report.id)}>Remove</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <Pager page={data.pagination.reportPage} total={data.pagination.reportTotal} pageSize={data.pagination.pageSize} onChange={setReportPage} />
            </section>

            <section>
              <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-extrabold">Comments ({data.pagination.commentTotal})</h2><select className="field-input" value={commentFilter} onChange={(event) => { setCommentFilter(event.target.value); setCommentPage(1); }}><option value="all">All comments</option><option value="pending">Pending review</option><option value="flagged">Flagged comments</option></select></div>
              <div className="mt-4 grid gap-3">
                {data.comments.map((comment) => (
                  <article className={`border-2 bg-white p-5 ${comment.publication_state === "pending_review" || comment.flag_count ? "border-red-400" : "border-[#d8d3c8]"}`} key={comment.id}><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-sm font-bold">{comment.nickname} {comment.flag_count > 0 && <span className="ml-2 text-xs text-red-700">{comment.flag_count} FLAG{comment.flag_count === 1 ? "" : "S"}</span>}</p><p className="mt-2 text-sm text-neutral-600">{comment.comment}</p><p className="font-data mt-2 text-xs text-neutral-400">{comment.publication_state}</p></div><div className="flex gap-2">{comment.publication_state === "pending_review" && <button className="button-primary" onClick={() => moderate("publish-comment", comment.id)}>Publish</button>}<button className="button-danger" onClick={() => window.confirm("Remove this comment?") && moderate("remove-comment", comment.id)}>Remove</button></div></div></article>
                ))}
              </div>
              <Pager page={data.pagination.commentPage} total={data.pagination.commentTotal} pageSize={data.pagination.pageSize} onChange={setCommentPage} />
            </section>

            <section><h2 className="font-display text-xl font-extrabold">Recent moderation activity</h2><p className="mt-1 text-xs text-neutral-500">Most recent 50 events</p><div className="mt-4 overflow-x-auto border-2 border-[#d8d3c8] bg-white"><table className="w-full text-left text-xs"><thead className="border-b-2 border-[#d8d3c8] bg-neutral-100"><tr><th className="p-3">When</th><th className="p-3">Action</th><th className="p-3">Target</th><th className="p-3">Details</th></tr></thead><tbody>{data.moderationEvents.map((event) => <tr className="border-b border-neutral-200 last:border-0" key={event.id}><td className="whitespace-nowrap p-3">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.created_at))}</td><td className="font-data p-3">{event.action}</td><td className="font-data p-3">{event.target_type}: {event.target_id}</td><td className="p-3 text-neutral-500">{event.metadata_summary || "—"}</td></tr>)}</tbody></table></div></section>
          </div>
        )}
      </div>
    </main>
  );
}
