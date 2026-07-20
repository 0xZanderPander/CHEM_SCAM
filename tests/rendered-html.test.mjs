import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the PLACARD report board replaces all starter content", async () => {
  const [layout, home, card, database] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/HomePage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ReportCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /PLACARD — Community Chemical Scam Reports/);
  assert.match(home, /Community-submitted, unverified/);
  assert.match(home, /Search by scammer name or domain/);
  assert.match(home, /File a report/);
  assert.match(card, /I experienced this too/);
  assert.match(database, /duplicate_reports/);
  assert.match(database, /confirmations/);
  assert.doesNotMatch(`${layout}${home}`, /codex-preview|react-loading-skeleton/i);
});

