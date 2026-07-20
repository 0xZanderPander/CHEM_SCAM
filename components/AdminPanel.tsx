"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Comment, Report } from "@/db";
import { Brand } from "./Brand";

export function AdminPanel() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/moderate", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { reports: Report[]; comments: Comment[] };
    setReports(data.reports);
    setComments(data.comments);
    setAuthorized(true);
  }, []);

  useEffect(() => {
    void fetch("/api/admin/moderate", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = (await response.json()) as { reports: Report[]; comments: Comment[] };
      setReports(data.reports);
      setComments(data.comments);
      setAuthorized(true);
    });
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setNotice(data.error ?? "Could not sign in.");
      return;
    }
    setPassword("");
    setNotice("");
    await load();
  }

  async function moderate(action: string, id: string, targetId?: string) {
    const response = await fetch("/api/admin/moderate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, id, targetId }) });
    const result = (await response.json()) as { error?: string };
    setNotice(response.ok ? "Moderation action completed." : result.error ?? "Action failed.");
    if (response.ok) await load();
  }

  return (
    <main className="min-h-screen">
      <header className="bg-[#171412] text-white"><div className="page-shell flex items-center justify-between py-5"><Brand compact /><Link href="/" className="button-secondary">← Public board</Link></div><div className="hazard-stripe" /></header>
      <div className="page-shell py-10">
        <p className="eyebrow text-neutral-500">Private workspace</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Moderation</h1>
        {!authorized ? (
          <form className="mt-8 max-w-md rounded-xl border border-neutral-200 bg-white p-6" onSubmit={login}>
            <label><span className="field-label">Admin password</span><input className="field-input mt-2 w-full" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {notice && <p className="mt-3 text-sm font-semibold text-red-700">{notice}</p>}
            <button className="button-primary mt-5">Open moderation</button>
          </form>
        ) : (
          <div className="mt-8 grid gap-8">
            {notice && <p className="rounded-lg bg-neutral-200 px-4 py-3 text-sm font-bold" role="status">{notice}</p>}
            <section>
              <h2 className="text-xl font-extrabold">Active reports ({reports.length})</h2>
              <div className="mt-4 grid gap-3">
                {reports.map((report) => (
                  <article className="rounded-xl border border-neutral-200 bg-white p-5" key={report.id}>
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="font-extrabold">{report.scammer_name}</p><p className="mt-1 text-xs text-neutral-500">{report.status} · {report.domain ?? "No domain"}</p></div><div className="flex flex-wrap gap-2"><button className="button-secondary" onClick={() => moderate("dispute", report.id)}>Mark disputed</button><select className="field-input" defaultValue="" onChange={(event) => event.target.value && moderate("merge", report.id, event.target.value)} aria-label={`Merge ${report.scammer_name} into another report`}><option value="">Merge into…</option>{reports.filter((target) => target.id !== report.id).map((target) => <option key={target.id} value={target.id}>{target.scammer_name}</option>)}</select><button className="button-danger" onClick={() => window.confirm("Remove this report?") && moderate("remove-report", report.id)}>Remove</button></div></div>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-xl font-extrabold">Comments ({comments.length})</h2>
              <div className="mt-4 grid gap-3">
                {comments.map((comment) => (
                  <article className={`rounded-xl border bg-white p-5 ${comment.flagged ? "border-red-400" : "border-neutral-200"}`} key={comment.id}><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-sm font-bold">{comment.nickname} {Boolean(comment.flagged) && <span className="ml-2 text-xs text-red-700">FLAGGED</span>}</p><p className="mt-2 text-sm text-neutral-600">{comment.comment}</p></div><button className="button-danger shrink-0" onClick={() => window.confirm("Remove this comment?") && moderate("remove-comment", comment.id)}>Remove</button></div></article>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
