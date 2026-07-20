# Privacy

This document describes the default PLACARD application behavior. An operator is responsible for documenting any changes they make to hosting, logging, retention, or third-party services.

## What the application collects

PLACARD has no public user accounts, requires no email address, and includes no analytics or advertising trackers. Public submissions can contain a nickname, scammer or website name, URL, description, comments, and supporting accounts. Published submissions, dates, counts, status, and nicknames are public. Contact information supplied through `/contact` is visible only to administrators unless an operator deliberately republishes it.

PostgreSQL stores reports, supporting accounts, comments, flag and confirmation hashes, admin-session hashes and expiry, rate-limit records, moderation events, and dispute requests. Removed material is soft-deleted by default so moderation decisions can be reviewed; operators should establish a retention schedule and permanently purge material when it is no longer needed for moderation, security, disputes, or applicable legal obligations.

## Browser tokens and confirmations

The browser creates a random opaque token and keeps it in local storage. The raw token is sent only when confirming a report or flagging a comment. The server stores an HMAC-SHA256 value derived with a private secret, not the raw token. A unique database constraint limits that browser token to one confirmation per report and one flag per comment.

This is not invasive fingerprinting and it does not establish a person's identity. Clearing browser storage creates another token. A separate, temporary per-report requester limit raises the cost of gaming a specific report, but a determined actor can use multiple IP addresses. Confirmations and flags do not prove unique humans or truth.

## Network addresses and rate limiting

The application does not intentionally store raw visitor IP addresses. For abuse controls it converts the requester IP into a date-scoped keyed HMAC and stores only that temporary identifier with an expiry. Rate-limit rows are lazily deleted on limiter reads when their windows have expired. The defaults are configurable in the environment.

That application-level design is not a promise that IP addresses can never be processed. The VPS provider, network protection systems, operating system, Docker, DNS provider, and Caddy necessarily handle connection data. Caddy access logging is disabled in the supplied configuration; an operator who enables logs must disclose retention and secure them.

## Moderation and sensitive data

Server-side validation rejects malformed and dangerous input. A limited automated screen sends likely contact details, payment-card numbers, home-address patterns, threats, or doxxing to `pending_review`. Detection is imperfect: it can miss sensitive data and can flag harmless text. Administrators decide whether pending content is published or removed.

## Hosting, retention, and security

Hosting location is chosen by the operator. The reference deployment is an Icelandic VPS, but the application is provider-agnostic. Hosting and network providers may process traffic under their own terms. Encrypted backups can retain database records until the configured backup-retention period ends; the supplied default is 14 days. Copies moved off-server follow the operator's chosen destination and retention controls.

No internet service can promise absolute anonymity or security. Browser compromise, server compromise, correlation with public writing, legal process, operator actions, and information voluntarily included in a report may identify a person. Do not submit personal information that is unnecessary to explain a report.

## Removal and correction requests

Use `/contact` to request a correction, status review, or removal. Contact information is optional and can be any return channel. The queue is a practical moderation channel, not a formal legal-notice system. See [MODERATION.md](MODERATION.md).

## Iceland and EEA context

The reference service is intended for infrastructure in Iceland, whose legal framework includes protections for publishing and freedom of expression associated with the Icelandic Modern Media Initiative. This is not immunity. Iceland is in the European Economic Area, and its [Data Protection Act No. 90/2018](https://www.personuvernd.is/media/uncategorized/Act_No_90_2018_on_Data_Protection_and_the_Processing_of_Personal_Data.pdf) implements the GDPR framework; the [EFTA Secretariat records the GDPR's entry into force in the EEA](https://www.efta.int/media-resources/news/general-data-protection-regulation-gdpr-entered-force-eea).

An EU/EEA resident named in a report may have a data-protection complaint distinct from a defamation or takedown claim. Free-expression protections do not by themselves resolve that issue. Hosting jurisdiction affects claims involving the service and infrastructure, but does not necessarily determine an individual operator's exposure in the operator's country of residence. This is general context, not legal advice or a guarantee of legal immunity. Regardless of legal theory, `/contact` is the correction and removal channel.
