import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, type DocSection } from "@/components/DocPage";

export const metadata: Metadata = {
  title: "Privacy & Policies",
  description:
    "PLACARD's privacy policy, moderation policy, report removal policy, and dispute policy — what is stored, for how long, and how to get something reviewed, corrected, or taken down.",
};

const sections: DocSection[] = [
  { id: "summary", title: "Summary" },
  { id: "privacy", title: "Privacy policy" },
  { id: "tokens", title: "Browser tokens" },
  { id: "network", title: "IPs & rate limits" },
  { id: "retention", title: "Retention" },
  { id: "moderation", title: "Moderation policy" },
  { id: "removal", title: "Removal policy" },
  { id: "dispute", title: "Dispute policy" },
  { id: "jurisdiction", title: "Jurisdiction" },
  { id: "limits", title: "Limits of anonymity" },
];

export default function Page() {
  return (
    <DocPage
      eyebrow="Privacy, moderation & removals"
      title="Privacy & Policies"
      summary="How this site handles data, how content is moderated, and how to get a report corrected, disputed, or removed. Written to describe what the software actually does — the source is public, so you can check."
      updated="20 July 2026"
      sections={sections}
    >
      <div className="doc-callout">
        <p>
          <strong>The short version.</strong> No accounts. No email required. No analytics, ads, trackers, or
          third-party fonts. Raw IP addresses are not intentionally stored. Anything you type into a public field is
          public and effectively permanent. To get something reviewed or removed, use the{" "}
          <Link href="/contact">contact form</Link>.
        </p>
      </div>

      <h2 id="summary">Summary</h2>
      <p>
        This page describes the default behaviour of the PLACARD software as deployed here. The operator is responsible
        for disclosing any change to hosting, logging, retention, or third-party services. Because the source code is
        published under the AGPL, the claims below are auditable rather than promissory.
      </p>

      <h2 id="privacy">Privacy policy</h2>
      <h3>What the site collects</h3>
      <p>
        There are no public user accounts and no email address is required at any point. There is no analytics package,
        no advertising network, no content delivery network, and no externally hosted fonts. Every asset is served from
        this domain.
      </p>
      <p>The database stores:</p>
      <ul>
        <li>reports, supporting accounts, and comments, together with their generated nicknames and timestamps;</li>
        <li>irreversible hashes representing confirmations and comment flags;</li>
        <li>hashed administrator session tokens and their expiry;</li>
        <li>short-lived, hashed rate-limit records;</li>
        <li>moderation audit events;</li>
        <li>messages submitted through the contact form, including any contact channel you choose to provide.</li>
      </ul>
      <h3>What is public</h3>
      <p>
        Published reports, supporting accounts, comments, nicknames, dates, counts, and statuses are visible to
        everyone. <strong>Assume search engines will index them.</strong>
      </p>
      <h3>What is not public</h3>
      <p>
        Messages sent through the contact form, and any contact channel you supply with them, are visible only to the
        operator. They are not republished unless you explicitly ask for that.
      </p>
      <h3>What you should not submit</h3>
      <p>
        Do not include personal information that is not necessary to explain a report — not your own, and not anyone
        else’s. An automated screen tries to catch likely phone numbers, addresses, payment-card numbers, threats, and
        doxxing and routes those submissions for review before publication. <strong>That screen is imperfect</strong>: it
        misses things and it produces false positives. It is a safety net, not a guarantee.
      </p>

      <h2 id="tokens">Browser tokens &amp; confirmations</h2>
      <p>
        Your browser generates a random opaque token and stores it locally. That raw token is transmitted only when you
        confirm a report or flag a comment. The server never stores it — it stores an HMAC-SHA256 value derived from the
        token using a secret the server holds. A database constraint on that value limits one confirmation per report
        and one flag per comment per browser.
      </p>
      <p>
        This is not device fingerprinting and it does not establish anyone’s identity. Clearing your browser storage
        produces a new token. It follows that <strong>confirmation counts do not prove distinct people</strong>, and a
        determined actor with multiple addresses can inflate them. Read counts accordingly.
      </p>

      <h2 id="network">Network addresses &amp; rate limiting</h2>
      <p>
        The application does not intentionally store raw visitor IP addresses. To enforce abuse limits it converts the
        requester address into a date-scoped keyed HMAC and stores only that temporary value with an expiry; rows are
        deleted once their window lapses.
      </p>
      <p>
        That is an application-level design, not a promise that no system anywhere processes your address. The hosting
        provider, network filtering, the operating system, Docker, the DNS provider, and the TLS reverse proxy all
        necessarily handle connection data. Access logging in the supplied reverse-proxy configuration is disabled; if
        the operator enables it, that change must be disclosed here.
      </p>

      <h2 id="retention">Retention</h2>
      <ul>
        <li>
          <strong>Removed content</strong> is soft-deleted by default so that moderation decisions remain auditable. It
          is no longer public, but it is not immediately erased from the database.
        </li>
        <li>
          <strong>Rate-limit records</strong> expire automatically within their window.
        </li>
        <li>
          <strong>Encrypted backups</strong> are retained for a configured period — 14 days by default. A record removed
          from the live site may persist in a backup until that window passes.
        </li>
        <li>
          <strong>Moderation audit events</strong> are retained so enforcement can be reviewed for consistency.
        </li>
      </ul>

      <h2 id="moderation">Moderation policy</h2>
      <h3>Publication review</h3>
      <p>
        Ordinary submissions publish after validation. Submissions the automated screen finds potentially sensitive
        enter a pending-review queue and are not public until a moderator acts. Flag counts prioritise review; a flag is
        not itself a finding that a comment broke the rules.
      </p>
      <h3>Duplicates and merges</h3>
      <p>
        An exact normalised-domain match attaches the new submission to the existing report as a supporting account.
        A match on <em>name alone never silently merges anything</em> — it creates a separate report marked as a possible
        match for a moderator to compare by hand. This is deliberate: similar names are common and merging on them would
        let one report absorb an unrelated seller.
      </p>
      <h3>Status thresholds</h3>
      <p>
        Three confirmations can automatically produce <strong>Community Confirmed</strong>; two attached supporting
        accounts can produce <strong>Repeatedly Reported</strong>. <strong>Disputed</strong> is only ever set by hand and
        is sticky — counts keep accruing, but only an explicit moderator action moves the listing off Disputed. These
        labels describe activity on this board, not proven misconduct.
      </p>
      <h3>Audit</h3>
      <p>
        Every material moderation action writes an audit event recording what was done, to what, and when. Prohibited
        content is listed on the <Link href="/about#prohibited">About &amp; Terms</Link> page.
      </p>

      <h2 id="removal">Report removal policy</h2>
      <p>
        Anyone — including the subject of a report — may request removal through the{" "}
        <Link href="/contact">contact form</Link>. You do not need a lawyer, and you do not need to identify yourself.
      </p>
      <h3>How to make a request effective</h3>
      <p>
        Include the report reference (the detail page pre-fills it), say plainly what is inaccurate or harmful, and
        supply whatever supports that. Requests that simply assert the report is false, with nothing else, are the
        hardest to act on.
      </p>
      <h3>What is weighed</h3>
      <ul>
        <li>whether the report contains unnecessary personal data — this alone is usually sufficient for removal;</li>
        <li>the concrete risk of harm to an identifiable person;</li>
        <li>whether the underlying allegation is still relevant or has been overtaken by events;</li>
        <li>what evidence either side has supplied;</li>
        <li>applicable law in the hosting jurisdiction;</li>
        <li>whether a narrower remedy — correcting a detail, or applying the Disputed marker — is enough.</li>
      </ul>
      <h3>Removed on sight</h3>
      <p>
        Doxxing, credible threats, sexual content involving minors, and content unlawful where the server is hosted are
        removed as soon as they are identified, without weighing anything else.
      </p>
      <h3>Outcomes</h3>
      <p>
        A request resolves as no action, report corrected, report marked Disputed, report removed, or other. Each
        outcome is recorded with a written note. Marking a report disputed or removed is applied atomically with the
        decision. If you left a contact channel, the operator will normally reply; without one, watch the report itself
        for the change.
      </p>
      <h3>Limits</h3>
      <p>
        This is a good-faith moderation channel operated by one person, not a formal legal-notice intake system, and not
        a statutory takedown mechanism. There is no service-level guarantee on response time. Removal from the live site
        does not immediately purge encrypted backups; see <a href="#retention">retention</a>.
      </p>

      <h2 id="dispute">Dispute policy</h2>
      <p>
        Where removal is not warranted but the accuracy of a report is genuinely contested, the report is marked{" "}
        <strong>Disputed</strong> rather than deleted. This is the board’s default remedy for a contested-but-plausible
        entry.
      </p>
      <ul>
        <li>The Disputed marker is prominent and sits alongside the report wherever it appears.</li>
        <li>
          It is <strong>sticky</strong>. Additional confirmations and supporting accounts do not clear it. Only an
          explicit moderator action changes it — so a subject cannot be shouted down by volume, and a reporter cannot
          restore standing by rallying confirmations.
        </li>
        <li>Either party may write in again with new information; a dispute can be revisited.</li>
        <li>Disputing a report is not an admission by anyone, and the marker is not a finding that the report is false.</li>
      </ul>
      <p>
        The operator does not adjudicate the underlying commercial dispute. The board records that a disagreement exists
        and lets readers weigh it.
      </p>

      <h2 id="jurisdiction">Jurisdiction &amp; data protection</h2>
      <p>
        The reference deployment uses infrastructure in Iceland, whose legal framework includes publishing and
        free-expression protections associated with the Icelandic Modern Media Initiative. That is not immunity.
      </p>
      <p>
        Iceland is a member of the European Economic Area, and its Data Protection Act No. 90/2018 implements the GDPR
        framework. A person named in a report who resides in the EU or EEA may therefore have a data-protection
        complaint that is distinct from any defamation or takedown argument, and free-expression protections do not by
        themselves resolve it. Hosting jurisdiction affects claims against the service and its infrastructure; it does
        not by itself determine an individual operator’s exposure where that operator lives.
      </p>
      <p>
        This is general background, not legal advice, and not a guarantee of any legal outcome. Whatever the asserted
        legal basis, the <Link href="/contact">contact form</Link> is the correction and removal channel.
      </p>

      <h2 id="limits">Limits of anonymity</h2>
      <p>
        No internet service can promise absolute anonymity or security. Realistically, you can be identified through
        browser or device compromise, server compromise, correlation between your writing here and elsewhere, legal
        process directed at the operator or a provider, operator error, and — most commonly —{" "}
        <strong>details you volunteer in the report itself</strong>.
      </p>
      <p>
        If your safety depends on not being identified, do not rely on this site alone. Use a browser and network setup
        appropriate to your threat model, and write your report so that it does not narrow down who you are.
      </p>
    </DocPage>
  );
}
