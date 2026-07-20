import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, type DocSection } from "@/components/DocPage";

export const metadata: Metadata = {
  title: "About & Terms",
  description:
    "What PLACARD is, how community reports work, the terms of use that govern the board, and the community guidelines every submission must follow.",
};

const sections: DocSection[] = [
  { id: "what-this-is", title: "What this is" },
  { id: "how-it-works", title: "How it works" },
  { id: "what-this-is-not", title: "What this is not" },
  { id: "terms", title: "Terms of use" },
  { id: "guidelines", title: "Community guidelines" },
  { id: "prohibited", title: "Prohibited content" },
  { id: "enforcement", title: "Enforcement" },
  { id: "liability", title: "Disclaimers & liability" },
  { id: "source", title: "Source & licence" },
  { id: "changes", title: "Changes" },
];

export default function Page() {
  return (
    <DocPage
      eyebrow="About the board"
      title="About & Terms"
      summary="PLACARD is an anonymous community board for sharing allegations about suspicious chemical suppliers, storefronts, and online sellers. This page explains what the board is, the terms that govern its use, and the guidelines every submission must meet."
      updated="20 July 2026"
      sections={sections}
    >
      <h2 id="what-this-is">What this is</h2>
      <p>
        PLACARD is a public, community-maintained record of <strong>allegations</strong> about suspicious chemical
        suppliers and online sellers. Anyone can file a report without creating an account, without providing an email
        address, and without identifying themselves. Other visitors can add context, confirm that they had a similar
        experience, and flag content that breaks the rules.
      </p>
      <p>
        The board exists because scam storefronts in this space move quickly, rebrand often, and rely on buyers having
        no shared memory. A public, searchable record makes that harder.
      </p>

      <h2 id="how-it-works">How it works</h2>
      <h3>Reports</h3>
      <p>
        A report names a seller or website and describes what happened. Every report is attributed to a generated
        nickname, not a person. Reports appear on the public board immediately unless automated checks route them to
        moderator review first.
      </p>
      <h3>Duplicates</h3>
      <p>
        If a new report names a website whose domain exactly matches an existing report, it is attached to that report
        as a supporting account rather than creating a second entry. Reports that only share a similar <em>name</em> are
        kept separate and queued for a moderator to look at, because similar names are not reliable evidence of the same
        seller.
      </p>
      <h3>Confirmations</h3>
      <p>
        Visitors can confirm a report if they had the same experience. Confirmations are limited per browser using a
        rotating, non-identifying token. This is a deliberate compromise: it stops the most casual vote-stuffing without
        tracking anyone. <strong>It does not prove that confirmations come from distinct people.</strong> Treat
        confirmation counts as a weak signal, not evidence.
      </p>
      <h3>Statuses</h3>
      <ul>
        <li>
          <strong>Unverified</strong> — the default. One report, no corroboration.
        </li>
        <li>
          <strong>Community Confirmed</strong> — enough visitors confirmed a similar experience.
        </li>
        <li>
          <strong>Repeatedly Reported</strong> — multiple separate reports were attached to the same domain.
        </li>
        <li>
          <strong>Disputed</strong> — someone has contested the report and a moderator applied the marker. Disputed is
          sticky: it stays visible regardless of confirmation count, so a contested entry cannot be buried by volume.
        </li>
      </ul>
      <p>
        Every status describes <em>community activity</em>, not verification. No status on this board means a claim has
        been investigated or proven.
      </p>

      <h2 id="what-this-is-not">What this is not</h2>
      <ul>
        <li>It is not a court, a regulator, an arbitrator, or a fraud investigator.</li>
        <li>It is not a verified database. Nothing here has been independently confirmed.</li>
        <li>It is not a credit or trust score, and it must not be used as one.</li>
        <li>It is not a channel for law enforcement reporting. Report crimes to the appropriate authority.</li>
        <li>It is not a marketplace, broker, or directory of suppliers, and it does not facilitate any transaction.</li>
      </ul>

      <h2 id="terms">Terms of use</h2>
      <p>
        By using this website you agree to the terms in this section, the{" "}
        <Link href="/policy">Privacy &amp; Policies</Link> page, and the community guidelines below. If you do not agree,
        do not use the site.
      </p>
      <h3>1. Eligibility</h3>
      <p>
        You must be legally capable of entering into these terms in your jurisdiction. Do not use the site if doing so
        would be unlawful where you are.
      </p>
      <h3>2. Your submissions</h3>
      <p>
        You are solely responsible for what you submit. By submitting, you represent that your account is truthful to the
        best of your knowledge, made in good faith, based on your own experience or on information you reasonably
        believe to be accurate, and that you have the right to share it.
      </p>
      <h3>3. Licence you grant</h3>
      <p>
        You grant the operator a non-exclusive, worldwide, royalty-free licence to host, store, display, reproduce, and
        distribute your submission on this site, and to edit it for length, formatting, or to remove content that
        violates these terms. You retain whatever rights you had in the underlying content.
      </p>
      <h3>4. No account, no recovery</h3>
      <p>
        There are no accounts. Because submissions are anonymous, the operator cannot verify that you authored a
        particular submission and generally cannot restore, edit, or delete a specific post on your request. Consider
        anything you submit permanent and public.
      </p>
      <h3>5. Availability</h3>
      <p>
        The site is provided on an as-is, as-available basis. It may be modified, suspended, or discontinued at any time,
        without notice, in whole or in part, including deleting all content.
      </p>
      <h3>6. Acceptable use</h3>
      <p>
        Do not attempt to circumvent rate limits, automate submissions, probe or attack the infrastructure, scrape the
        site at volume, or interfere with other users. The operator may block access without notice.
      </p>
      <h3>7. Termination</h3>
      <p>
        The operator may remove any content and block any visitor at any time, for any reason, including reasons not
        listed here.
      </p>

      <h2 id="guidelines">Community guidelines</h2>
      <p>These apply to reports, supporting accounts, and comments alike.</p>
      <ol>
        <li>
          <strong>Write what happened, not what you conclude.</strong> Describe the transaction, the timeline, and the
          outcome. Let readers draw inferences.
        </li>
        <li>
          <strong>Be specific.</strong> Dates, the domain used, the payment method, and what was promised versus what
          arrived are what make a report useful.
        </li>
        <li>
          <strong>Separate fact from suspicion.</strong> If you are speculating, say so plainly.
        </li>
        <li>
          <strong>Target businesses, not people.</strong> Report storefronts, brands, and websites. Do not build a
          dossier on a named individual.
        </li>
        <li>
          <strong>Leave out personal data.</strong> No names of private individuals, home addresses, phone numbers,
          personal emails, workplaces, photographs, ID documents, or account numbers — yours or anyone else’s.
        </li>
        <li>
          <strong>Do not post as revenge.</strong> Reports filed to punish a competitor, an ex-partner, or a personal
          grudge will be removed.
        </li>
        <li>
          <strong>One experience, one report.</strong> Do not file the same complaint repeatedly to inflate its
          apparent weight.
        </li>
        <li>
          <strong>Correct yourself.</strong> If you learn you were wrong, use the{" "}
          <Link href="/contact">contact form</Link> and say so. Withdrawn reports are handled without penalty.
        </li>
      </ol>

      <h2 id="prohibited">Prohibited content</h2>
      <p>The following are removed on sight and may result in a block:</p>
      <ul>
        <li>Personal information about private individuals (doxxing), including partial identifiers assembled to identify someone.</li>
        <li>Threats, incitement to violence, harassment campaigns, or calls to retaliate against a named party.</li>
        <li>Content that is unlawful where the server is hosted.</li>
        <li>Sexual content involving minors, or any content sexualising a minor.</li>
        <li>Solicitations to buy or sell controlled substances, precursors, weapons, or anything else regulated — including offers framed as legitimate supply.</li>
        <li>Instructions for synthesising controlled or hazardous substances, or for building weapons.</li>
        <li>Malware, phishing links, or links whose purpose is to compromise readers.</li>
        <li>Commercial advertising, affiliate links, or promotion of a competing supplier.</li>
        <li>Impersonation of a moderator, an operator, or any organisation.</li>
        <li>Knowingly false reports, coordinated brigading, or manipulation of confirmation counts.</li>
        <li>Bulk-copied content from other sites presented as first-hand experience.</li>
      </ul>
      <div className="doc-callout">
        <p>
          <strong>Note on scope.</strong> This board is about identifying fraudulent sellers. It is not a venue for
          arranging any purchase, lawful or otherwise. Submissions that read as attempts to source material are removed
          regardless of how they are worded.
        </p>
      </div>

      <h2 id="enforcement">Enforcement</h2>
      <p>
        Moderation is handled by the operator. Content can be held for review before publication, removed after
        publication, or marked Disputed. Every moderation action is written to an internal audit log so that decisions
        can be reviewed for consistency. Enforcement is discretionary; there is no appeal process beyond writing in via
        the <Link href="/contact">contact form</Link>. The full process is described on the{" "}
        <Link href="/policy#moderation">Policy</Link> page.
      </p>

      <h2 id="liability">Disclaimers &amp; liability</h2>
      <p>
        <strong>The site and all content are provided “as is”, without warranty of any kind</strong>, express or implied,
        including any warranty of accuracy, fitness for a particular purpose, or non-infringement.
      </p>
      <p>
        Content on this board is submitted by anonymous members of the public. It is not verified. It may be incomplete,
        outdated, mistaken, or deliberately false. The operator does not endorse, adopt, or vouch for any statement made
        in a report or comment, and does not act as the publisher or speaker of user submissions.
      </p>
      <p>
        To the maximum extent permitted by law, the operator is not liable for any direct, indirect, incidental,
        consequential, or punitive damages arising from your use of the site or your reliance on anything posted here.
        You use this information at your own risk and remain responsible for your own due diligence.
      </p>
      <p>
        Nothing on this site is legal advice. If a report concerns you and you believe you have been defamed, seek advice
        from a qualified lawyer in your jurisdiction. The <Link href="/policy#removal">removal</Link> and{" "}
        <Link href="/policy#dispute">dispute</Link> processes are offered as a good-faith courtesy and are not a
        substitute for legal process.
      </p>

      <h2 id="source">Source &amp; licence</h2>
      <p>
        This site runs entirely on infrastructure controlled by its operator: a single server running the application,
        a PostgreSQL database, and a reverse proxy for TLS. There are no third-party analytics, advertising networks,
        content delivery networks, or embedded fonts — every asset is served from this domain.
      </p>
      <p>
        The software is free software licensed under the GNU Affero General Public License v3.0. The complete
        corresponding source for the version running here is available at{" "}
        <a href="https://github.com/0xZanderPander/CHEM_SCAM" rel="noreferrer noopener">
          the project repository
        </a>
        . If you modify it and run it as a network service, the AGPL requires you to offer your users the same.
      </p>

      <h2 id="changes">Changes</h2>
      <p>
        These terms may change. The revision date at the top of this page is updated when they do, and the change history
        is visible in the public source repository. Continuing to use the site after a change means you accept the
        revised terms.
      </p>
    </DocPage>
  );
}
