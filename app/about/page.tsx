import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, type DocSection } from "@/components/DocPage";

export const metadata: Metadata = {
  title: "About & Terms",
  description: "What PLACARD is, how reports work, the terms of use, and the rules every submission must follow.",
};

const sections: DocSection[] = [
  { id: "what-this-is", title: "What this is" },
  { id: "how-it-works", title: "How it works" },
  { id: "terms", title: "Terms of use" },
  { id: "guidelines", title: "Guidelines" },
  { id: "prohibited", title: "Prohibited" },
  { id: "liability", title: "Disclaimers" },
];

export default function Page() {
  return (
    <DocPage
      eyebrow="About the board"
      title="About & Terms"
      summary="An anonymous community board for reporting suspicious chemical suppliers and online sellers."
      updated="20 July 2026"
      sections={sections}
    >
      <h2 id="what-this-is">What this is</h2>
      <p>
        A public record of <strong>allegations</strong> about suspicious suppliers and sellers. Anyone can file a report
        with no account, no email, and no name. Others can add context, confirm a similar experience, or flag content
        that breaks the rules.
      </p>
      <p>It is not a court, a regulator, an investigator, or a verified database. Nothing here has been proven.</p>

      <h2 id="how-it-works">How it works</h2>
      <p>
        A report names a seller and describes what happened, attributed to a generated nickname. Reports publish
        immediately unless automated checks hold them for review.
      </p>
      <p>
        A new report matching an existing <strong>domain</strong> attaches to it as a supporting account. A match on
        name alone stays separate and is queued for a human — similar names are not evidence of the same seller.
      </p>
      <p>
        Visitors can confirm a report. Confirmations are limited per browser by a rotating, non-identifying token: enough
        to stop casual vote-stuffing, <strong>not enough to prove distinct people</strong>. Treat counts as a weak signal.
      </p>
      <ul>
        <li><strong>Unverified</strong> — one report, no corroboration.</li>
        <li><strong>Community Confirmed</strong> — several visitors reported the same experience.</li>
        <li><strong>Repeatedly Reported</strong> — multiple reports on the same domain.</li>
        <li><strong>Disputed</strong> — contested and marked by a moderator. Sticky, so volume cannot bury it.</li>
      </ul>
      <p>Every status describes activity here. None of them means a claim was investigated or proven.</p>

      <h2 id="terms">Terms of use</h2>
      <p>
        Using this site means accepting these terms and the <Link href="/policy">privacy and policy</Link> page.
      </p>
      <ol>
        <li>
          <strong>Your submissions are yours.</strong> You are responsible for them, and you confirm they are truthful
          to the best of your knowledge and made in good faith.
        </li>
        <li>
          <strong>You license us to publish them.</strong> Non-exclusive, worldwide, royalty-free — including the right
          to edit for length or to remove content that breaks these terms.
        </li>
        <li>
          <strong>Posts are permanent.</strong> There are no accounts, so the operator cannot verify you wrote something
          and generally cannot delete a specific post on request.
        </li>
        <li>
          <strong>The site is as-is.</strong> It may change, break, or shut down at any time, without notice.
        </li>
        <li>
          <strong>Do not attack it.</strong> No circumventing rate limits, automating submissions, probing the
          infrastructure, or bulk scraping. Access may be blocked without notice.
        </li>
      </ol>

      <h2 id="guidelines">Guidelines</h2>
      <ol>
        <li><strong>Describe what happened, not what you conclude.</strong> Let readers infer.</li>
        <li><strong>Be specific.</strong> Dates, domain, payment method, what was promised versus what arrived.</li>
        <li><strong>Flag speculation as speculation.</strong></li>
        <li><strong>Target businesses, not people.</strong> Storefronts and websites — not individuals.</li>
        <li>
          <strong>Leave out personal data.</strong> No names of private individuals, addresses, phone numbers, emails,
          workplaces, photos, or account numbers — yours or anyone else’s.
        </li>
        <li><strong>No revenge posts.</strong> Grudges against competitors or ex-partners get removed.</li>
        <li><strong>One experience, one report.</strong> Do not repost to inflate weight.</li>
        <li>
          <strong>Correct yourself.</strong> Wrong about something? Use the <Link href="/contact">contact form</Link>.
          No penalty.
        </li>
      </ol>

      <h2 id="prohibited">Prohibited</h2>
      <p>Removed on sight, and may result in a block:</p>
      <ul>
        <li>Personal information about private individuals, including identifiers assembled to expose someone.</li>
        <li>Threats, incitement, or harassment campaigns.</li>
        <li>Content unlawful where the server is hosted.</li>
        <li>Any sexualisation of minors.</li>
        <li>Offers to buy or sell controlled substances, precursors, or weapons — however they are worded.</li>
        <li>Synthesis or weapon-building instructions.</li>
        <li>Malware, phishing, or links intended to compromise readers.</li>
        <li>Advertising, affiliate links, or promotion of a competing supplier.</li>
        <li>Impersonation of a moderator or organisation.</li>
        <li>Knowingly false reports, brigading, or manipulating confirmation counts.</li>
      </ul>
      <div className="doc-callout">
        <p>
          <strong>Scope.</strong> This board identifies fraudulent sellers. It is not a venue for arranging a purchase
          of anything. Submissions that read as sourcing attempts are removed.
        </p>
      </div>
      <p>
        Moderation is discretionary and every action is logged. The process is on the{" "}
        <Link href="/policy#moderation">policy page</Link>.
      </p>

      <h2 id="liability">Disclaimers</h2>
      <p>
        <strong>Provided as is, with no warranty of any kind</strong> — including accuracy or fitness for any purpose.
      </p>
      <p>
        Content is submitted anonymously by the public and is not verified. It may be incomplete, outdated, mistaken, or
        deliberately false. The operator does not endorse or adopt any statement made in a report or comment.
      </p>
      <p>
        To the maximum extent permitted by law, the operator is not liable for any damages arising from your use of this
        site or reliance on anything posted. You remain responsible for your own due diligence.
      </p>
      <p>
        Nothing here is legal advice. If a report concerns you, see the{" "}
        <Link href="/policy#removal">removal</Link> and <Link href="/policy#dispute">dispute</Link> processes — offered
        in good faith, and not a substitute for legal process.
      </p>
      <p>
        This site runs on infrastructure controlled by its operator. There are no analytics, ad networks, CDNs, or
        third-party fonts — every asset is served from this domain.
      </p>
    </DocPage>
  );
}
