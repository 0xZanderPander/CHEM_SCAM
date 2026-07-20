# Moderation

PLACARD publishes community-submitted allegations. Reports, supporting accounts, comments, confirmations, and flags are not legal findings and are not independently verified merely because the interface displays a status or count.

## Prohibited content

Do not submit:

- home addresses, private phone numbers, personal email addresses, payment-card data, credentials, or other unnecessary identifying data;
- threats, incitement, targeted harassment, or instructions for violence;
- knowingly false allegations, impersonation, spam, malware, or dangerous links;
- copyrighted material beyond what is reasonably needed to describe or support a report;
- content whose primary purpose is exposing or intimidating a private person.

Doxxing and credible threats should be removed promptly. The automated screen only routes likely sensitive content for review and cannot guarantee detection.

## Publication review

Ordinary reports and comments are published after validation. Potentially sensitive submissions enter `pending_review` and are visible in the admin queue. A flag count prioritizes review but does not establish that a comment violates policy. An administrator can publish or remove queued material and each material action creates an audit event.

## Duplicate and merge policy

An exact normalized-domain match attaches a new submission as a supporting account. Matching a name alone never silently merges reports: it creates a separate report marked as a possible match for admin review. Administrators may merge listings after comparing the entities and supporting text. Removed and merged material remains auditable in the database until the operator's retention policy purges it.

## Status policy

Three confirmations may automatically produce `Community Confirmed`; two attached accounts may produce `Repeatedly Reported`. These labels describe activity on PLACARD, not proven misconduct. `Disputed` is set manually and is sticky: confirmations and supporting accounts continue to be counted, but only an explicit admin action can move the listing to another status.

## Disputes, corrections, and removals

Anyone can use `/contact`; a report-detail link pre-fills the listing reference, and `/dispute` redirects there for older links. The requester chooses a category — removal, correction, dispute, conduct, security, or general — which is validated against a database check constraint; security and conduct requests sort to the top of the admin queue. The requester supplies a message and may optionally leave a contact channel. Resolving a request requires an administrator to choose a recorded resolution type and write a note. Marking a linked report disputed or removed applies that action in the same database transaction; no-action, corrected, and other resolutions record the decision without making an automatic report change. The form is a moderation queue and not a formal legal-notice workflow.

Removal decisions should consider relevance, evidence supplied, unnecessary personal data, risk of harm, applicable law, and whether a narrower correction or disputed label is sufficient. The operator should document any legally required retention or notice process separately.

## Iceland and jurisdiction

The reference deployment uses infrastructure in Iceland, a jurisdiction with legal protections for publishing and freedom of expression associated with the Icelandic Modern Media Initiative. Iceland is also an EEA member and applies the GDPR through its own data-protection law. A person named in a report may have a data-protection complaint separate from defamation or takedown arguments, and free-expression protections do not eliminate that avenue.

Hosting jurisdiction affects claims against the service or infrastructure; it does not alone decide an individual operator's possible exposure in the operator's home jurisdiction. This is factual background, not legal advice or a promise of immunity. Use `/contact` for correction or removal requests regardless of the asserted legal basis.
