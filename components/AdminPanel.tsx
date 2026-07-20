"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Comment, Report, ReportStatus } from "@/db";
import { Brand } from "./Brand";

type DisputeRequest = { id: string; report_id: string | null; contact_info: string | null; message: string; created_at: string };
type PendingDuplicate = { id: string; report_id: string; nickname: string; description: string; website: string | null; created_at: string };
type AdminData = { reports: Report[]; comments: Comment[]; disputes: DisputeRequest[]; pendingDuplicates: PendingDuplicate[] };

function csrfToken() {
  return document.cookie.split("; ").find((item) => item.startsWith("placard_csrf="))?.split("=").slice(1).join("=") || "";
}
export function AdminPanel() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [data, setData] = useState<AdminData>({ reports: [], comments: [], disputes: [], pendingDuplicates: [] });
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/moderate", { cache: "no-store" });
    if (!response.ok) { setAuthorized(false); return; }
    setData((await response.json()) as AdminData);
    setAuthorized(true);
  }, []);

  useEffect(() => {
    void fetch("/api/admin/moderate", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      setData((await response.json()) as AdminData);
      setAuthorized(true);
    });
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) { setNotice(result.error || "Could not sign in."); return; }
    setPassword("");
    setNotice("");
    await load();
  }

  async function moderate(action: string, id: string, extra: { targetId?: string; status?: ReportStatus; note?: string } = {}) {
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
    setData({ reports: [], comments: [], disputes: [], pendingDuplicates: [] });
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
                    <div className="mt-4 flex gap-2">{request.report_id && <Link href={`/reports/${request.report_id}`} className="button-secondary">View report</Link>}<button className="button-primary" onClick={() => moderate("resolve-dispute", request.id, { note: window.prompt("Optional resolution note") || "" })}>Mark resolved</button></div>
                  </article>
                )) : <p className="text-sm text-neutral-500">No open correction requests.</p>}
              </div>
            </section>

            {data.pendingDuplicates.length > 0 && <section><h2 className="font-display text-xl font-extrabold">Supporting accounts pending review ({data.pendingDuplicates.length})</h2><div className="mt-4 grid gap-3">{data.pendingDuplicates.map((item) => <article className="border-2 border-[#e8590c] bg-white p-5" key={item.id}><p className="text-sm leading-7">{item.description}</p><p className="font-data mt-2 text-xs text-neutral-500">By {item.nickname} · Parent report {item.report_id}</p><button className="button-primary mt-4" onClick={() => moderate("publish-duplicate", item.id)}>Publish account</button></article>)}</div></section>}

            <section>
              <h2 className="font-display text-xl font-extrabold">Reports ({data.reports.length})</h2>
              <div className="mt-4 grid gap-3">
                {data.reports.map((report) => (
                  <article className={`border-2 bg-white p-5 ${report.publication_state === "pending_review" || report.possible_duplicate_of ? "border-[#e8590c]" : "border-[#d8d3c8]"}`} key={report.id}>
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div><p className="font-extrabold">{report.scammer_name}</p><p className="font-data mt-1 text-xs text-neutral-500">{report.status} · {report.domain || "No domain"} · {report.publication_state}{report.possible_duplicate_of ? ` · possible match: ${report.possible_duplicate_of}` : ""}</p></div>
                      <div className="flex flex-wrap gap-2">
                        {report.publication_state === "pending_review" && <button className="button-primary" onClick={() => moderate("publish-report", report.id)}>Publish</button>}
                        <select className="field-input" value={report.status} onChange={(event) => moderate("set-status", report.id, { status: event.target.value as ReportStatus })} aria-label={`Status for ${report.scammer_name}`}><option>Unverified</option><option>Community Confirmed</option><option>Repeatedly Reported</option><option>Disputed</option></select>
                        <select className="field-input" defaultValue="" onChange={(event) => event.target.value && moderate("merge", report.id, { targetId: event.target.value })} aria-label={`Merge ${report.scammer_name} into another report`}><option value="">Merge into…</option>{data.reports.filter((target) => target.id !== report.id).map((target) => <option key={target.id} value={target.id}>{target.scammer_name}</option>)}</select>
                        <button className="button-danger" onClick={() => window.confirm("Remove this report?") && moderate("remove-report", report.id)}>Remove</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-display text-xl font-extrabold">Comments ({data.comments.length})</h2>
              <div className="mt-4 grid gap-3">
                {data.comments.map((comment) => (
                  <article className={`border-2 bg-white p-5 ${comment.publication_state === "pending_review" || comment.flag_count ? "border-red-400" : "border-[#d8d3c8]"}`} key={comment.id}><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-sm font-bold">{comment.nickname} {comment.flag_count > 0 && <span className="ml-2 text-xs text-red-700">{comment.flag_count} FLAG{comment.flag_count === 1 ? "" : "S"}</span>}</p><p className="mt-2 text-sm text-neutral-600">{comment.comment}</p><p className="font-data mt-2 text-xs text-neutral-400">{comment.publication_state}</p></div><div className="flex gap-2">{comment.publication_state === "pending_review" && <button className="button-primary" onClick={() => moderate("publish-comment", comment.id)}>Publish</button>}<button className="button-danger" onClick={() => window.confirm("Remove this comment?") && moderate("remove-comment", comment.id)}>Remove</button></div></div></article>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
