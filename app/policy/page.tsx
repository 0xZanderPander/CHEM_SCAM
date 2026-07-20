import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, type DocSection } from "@/components/DocPage";

export const metadata: Metadata = {
  title: "Privacy & Policies",
  description: "What this site stores, how long it keeps it, how content is moderated, and how to get something removed.",
};

const sections: DocSection[] = [
  { id: "privacy", title: "Privacy" },
  { id: "tokens", title: "Browser tokens" },
  { id: "retention", title: "Retention" },
  { id: "moderation", title: "Moderation" },
  { id: "removal", title: "Removals" },
  { id: "dispute", title: "Disputes" },
  { id: "jurisdiction", title: "Jurisdiction" },
  { id: "limits", title: "Limits" },
];

export default function Page() {
  return (
    <DocPage
      eyebrow="Privacy, moderation & removals"
      title="Privacy & Policies"
      summary="What is stored, how content is moderated, and how to get a report corrected or removed."
      updated="20 July 2026"
      sections={sections}
    >
      <div className="doc-callout">
        <p>
          <strong>Short version.</strong> No accounts. No email. No analytics, ads, trackers, or third-party fonts. Raw
          IP addresses are not stored. Anything typed into a public field is public and permanent. To get something
          removed, use the <Link href="/contact">contact form</Link>.
        </p>
      </div>

      <h2 id="privacy">Privacy</h2>
      <p>The database holds:</p>
      <ul>
        <li>reports, supporting accounts, and comments, with their nicknames and timestamps;</li>
        <li>irreversible hashes representing confirmations and flags;</li>
        <li>hashed admin sessions and short-lived rate-limit records;</li>
        <li>moderation audit events;</li>
        <li>contact-form messages, including any reply channel you choose to give.</li>
      </ul>
      <p>
        <strong>Public:</strong> published reports, comments, nicknames, dates, counts, statuses. Assume search engines
        index them. <strong>Not public:</strong> contact-form messages and any contact details in them.
      </p>
      <p>
        Do not include personal information that is not needed to explain a report. An automated screen tries to catch
        phone numbers, addresses, card numbers, threats, and doxxing and holds those submissions for review.{" "}
        <strong>It is imperfect</strong> — it misses things and flags harmless text.
      </p>

      <h2 id="tokens">Browser tokens &amp; IP addresses</h2>
      <p>
        Your browser stores a random token locally. It is sent only when you confirm a report or flag a comment, and the
        server keeps an HMAC of it, never the token itself. That limits one confirmation per report and one flag per
        comment per browser.
      </p>
      <p>
        This is not fingerprinting and does not identify anyone. Clearing browser storage produces a new token — so
        confirmation counts <strong>do not prove distinct people</strong>.
      </p>
      <p>
        Raw IP addresses are not stored. For abuse limits the address becomes a date-scoped keyed hash with an expiry.
        That is an application-level design, not a promise about every system in the path: the host, the OS, Docker, DNS,
        and the TLS proxy all handle connection data. Proxy access logging is off; if that changes it will be disclosed here.
      </p>

      <h2 id="retention">Retention</h2>
      <ul>
        <li><strong>Removed content</strong> is soft-deleted so decisions stay auditable — not public, not yet erased.</li>
        <li><strong>Rate-limit records</strong> expire automatically.</li>
        <li><strong>Encrypted backups</strong> are kept 14 days by default. Removed content can persist that long.</li>
        <li><strong>Audit events</strong> are kept so enforcement can be reviewed.</li>
      </ul>

      <h2 id="moderation">Moderation</h2>
      <p>
        Submissions publish after validation; anything the screen finds sensitive is held until a moderator acts. Flags
        prioritise review but are not themselves a finding.
      </p>
      <p>
        An exact domain match attaches a submission to the existing report. A name-only match{" "}
        <em>never silently merges</em> — it creates a separate report for a human to compare, because merging on names
        would let one report absorb an unrelated seller.
      </p>
      <p>
        Three confirmations can produce <strong>Community Confirmed</strong>; two supporting accounts can produce{" "}
        <strong>Repeatedly Reported</strong>. <strong>Disputed</strong> is set only by hand and is sticky. Every material
        action writes an audit event. Prohibited content is listed on the{" "}
        <Link href="/about#prohibited">About page</Link>.
      </p>

      <h2 id="removal">Removals</h2>
      <p>
        Anyone — including the subject of a report — can request removal via the{" "}
        <Link href="/contact">contact form</Link>. No lawyer, no identification.
      </p>
      <p>
        Include the report reference, say what is inaccurate or harmful, and supply whatever supports that. A bare
        assertion that a report is false is the hardest thing to act on.
      </p>
      <p>What gets weighed:</p>
      <ul>
        <li>unnecessary personal data — usually sufficient on its own;</li>
        <li>concrete risk of harm to an identifiable person;</li>
        <li>whether the allegation is still relevant;</li>
        <li>evidence from either side;</li>
        <li>whether a correction or the Disputed marker is enough.</li>
      </ul>
      <p>
        Doxxing, credible threats, sexual content involving minors, and unlawful content are removed immediately without
        weighing anything else.
      </p>
      <p>
        Outcomes: no action, corrected, marked Disputed, or removed — each recorded with a note. This is a good-faith
        channel run by one person, not a statutory takedown system, and carries no guaranteed response time. Removal from
        the site does not immediately purge <a href="#retention">backups</a>.
      </p>

      <h2 id="dispute">Disputes</h2>
      <p>
        Where removal is not warranted but accuracy is genuinely contested, a report is marked{" "}
        <strong>Disputed</strong> rather than deleted.
      </p>
      <ul>
        <li>The marker sits alongside the report wherever it appears.</li>
        <li>
          It is <strong>sticky</strong> — further confirmations do not clear it. A subject cannot be shouted down by
          volume, and a reporter cannot restore standing by rallying confirmations.
        </li>
        <li>Either side can write in again with new information.</li>
        <li>Disputing is not an admission, and the marker is not a finding that the report is false.</li>
      </ul>
      <p>The operator does not adjudicate the underlying commercial dispute — only records that one exists.</p>

      <h2 id="jurisdiction">Jurisdiction</h2>
      <p>
        The service runs on infrastructure in Iceland, which has publishing and free-expression protections. That is not
        immunity.
      </p>
      <p>
        Iceland is in the EEA and applies the GDPR framework through its Data Protection Act No. 90/2018. Someone named
        in a report who lives in the EU or EEA may have a data-protection complaint separate from any defamation
        argument. Hosting jurisdiction affects claims against the service; it does not by itself determine an operator’s
        exposure where they live.
      </p>
      <p>
        General background, not legal advice. Whatever the legal basis, the <Link href="/contact">contact form</Link> is
        the channel.
      </p>

      <h2 id="limits">Limits of anonymity</h2>
      <p>
        No service can promise anonymity. You can be identified through device or server compromise, correlation with
        your writing elsewhere, legal process, operator error, and — most commonly —{" "}
        <strong>details you volunteer in the report itself</strong>.
      </p>
      <p>
        If your safety depends on not being identified, do not rely on this site alone. Use a browser and network setup
        suited to your threat model, and write so the report does not narrow down who you are.
      </p>
    </DocPage>
  );
}
