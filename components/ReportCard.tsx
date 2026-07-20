"use client";

import Link from "next/link";
import { useState } from "react";
import type { Report } from "@/db";

const statusTone: Record<Report["status"], string> = {
  Unverified: "diamond-unverified",
  "Community Confirmed": "diamond-confirmed",
  "Repeatedly Reported": "diamond-repeated",
  Disputed: "diamond-disputed",
};

function browserFingerprint() {
  const key = "chem-scam-browser-id";
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

export function ReportCard({ report, onConfirmed }: { report: Report; onConfirmed: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function confirm() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/reports/${report.id}/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fingerprint: browserFingerprint() }),
    });
    const data = (await response.json()) as { error?: string };
    if (response.ok) {
      setMessage("Confirmation added.");
      onConfirmed();
    } else setMessage(data.error ?? "Could not add confirmation.");
    setBusy(false);
  }

  return (
    <article className="report-card">
      <div className="flex gap-5">
        <span className={`status-diamond mt-1 ${statusTone[report.status]}`} title={report.status} aria-label={report.status} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-bold tracking-[0.01em]">
              <Link href={`/reports/${report.id}`} className="hover:text-[#e8590c]">{report.scammer_name}</Link>
            </h2>
            <span className={`status-label ${report.status === "Disputed" ? "text-[#c81e1e]" : report.status === "Repeatedly Reported" ? "text-[#e8590c]" : report.status === "Community Confirmed" ? "text-[#1b5fa8]" : "text-[#6b6558]"}`}>{report.status}</span>
          </div>
          {report.domain ? (
            <a href={report.website?.match(/^https?:\/\//i) ? report.website : `https://${report.website}`} target="_blank" rel="noreferrer nofollow" className="font-data mt-1 inline-block break-all text-sm text-[#6b6558] hover:text-[#e8590c]">{report.domain}</a>
          ) : <p className="font-data mt-1 text-sm text-[#6b6558]">No website supplied</p>}
          <p className="mt-3 text-[15px] leading-7 text-[#2b2724]">{report.description}</p>
          <div className="font-data mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#6b6558]">
            <span>by <b className="text-[#171412]">{report.nickname}</b></span><span>·</span>
            <time>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(report.created_at))}</time><span>·</span>
            <span>✓ {report.confirmations} confirmations</span><span>▣ {report.duplicate_count} duplicate reports</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button className="button-primary" onClick={confirm} disabled={busy || report.status === "Disputed"}>{report.status === "Disputed" ? "Confirmations paused" : busy ? "Adding…" : "I experienced this too"}</button>
        <Link href={`/reports/${report.id}`} className="button-secondary">View report →</Link>
      </div>
      {message && <p className="font-data mt-2 text-right text-xs text-[#6b6558]" role="status">{message}</p>}
    </article>
  );
}

