#!/usr/bin/env bash
# End-to-end smoke test against a running stack. Exercises the real database
# rather than mocks: duplicate attachment, confirmations, comments, flags,
# contact categories, abuse controls, and the admin moderation queue.
#
#   ./scripts/smoke-test.sh [base-url]      default: https://localhost
#
# Uses curl -k because the local rehearsal stack serves Caddy's internal cert.
#
# Every assertion assigns the result to a variable first and only then compares.
# Embedding a command substitution directly in check's argument list caused the
# result to be word-split into extra positional parameters, so the expected
# value landed in the wrong slot and assertions reported PASS while comparing a
# value against itself. Keep the assign-then-compare shape.
set -uo pipefail

BASE="${1:-https://localhost}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(grep '^ADMIN_PASSWORD=' .env | cut -d= -f2-)}"
JAR=$(mktemp)
PASS=0
FAIL=0
trap 'rm -f "$JAR"' EXIT

c() { curl -sk "$@"; }
past() { python3 -c "import time; print(int(time.time()*1000)-5000)"; }
now() { python3 -c "import time; print(int(time.time()*1000))"; }
pg() { docker compose exec -T postgres psql -U chem_scam -d chem_scam -tA "$@"; }
jq_() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)" 2>/dev/null || echo "PARSE_ERROR"; }

# The limiter is deliberately strict, so a full pass would otherwise trip it
# partway through and later assertions would measure the limiter instead of the
# thing under test. Cleared between sections; exercised on purpose in its own.
clear_limits() { pg -c "DELETE FROM rate_limits;" >/dev/null 2>&1; }
reset_db() {
  pg -c "TRUNCATE reports, duplicate_reports, comments, confirmations, comment_flags, dispute_requests, moderation_events, rate_limits, admin_sessions RESTART IDENTITY CASCADE;" >/dev/null 2>&1
}

check() { # check <name> <actual> <expected>
  if [ "$#" -ne 3 ]; then
    printf "  \033[31mBUG \033[0m  %-52s harness passed %d args, not 3\n" "${1:-?}" "$#"
    FAIL=$((FAIL+1)); return
  fi
  local name="$1" actual expected
  actual="$(printf '%s' "$2" | tr -d '[:space:]')"
  expected="$(printf '%s' "$3" | tr -d '[:space:]')"
  if [ "$actual" = "$expected" ]; then
    printf "  \033[32mPASS\033[0m  %-52s %s\n" "$name" "$actual"; PASS=$((PASS+1))
  else
    printf "  \033[31mFAIL\033[0m  %-52s got '%s' want '%s'\n" "$name" "$actual" "$expected"; FAIL=$((FAIL+1))
  fi
}

post_report() { # post_report <name> <website> <desc>
  local ts; ts=$(past)
  c -X POST "$BASE/api/reports" -H 'content-type: application/json' \
    -d "{\"scammerName\":\"$1\",\"website\":\"$2\",\"description\":\"$3\",\"nickname\":\"Test Potato\",\"company\":\"\",\"startedAt\":$ts}"
}

report_code() { # report_code <name> <website> <desc> <company> <startedAt>
  c -o /dev/null -w '%{http_code}' -X POST "$BASE/api/reports" -H 'content-type: application/json' \
    -d "{\"scammerName\":\"$1\",\"website\":\"$2\",\"description\":\"$3\",\"nickname\":\"N\",\"company\":\"$4\",\"startedAt\":$5}"
}

reset_db
echo "── Public submission paths ─────────────────────────────────────────────"

R1=$(post_report "ReagentSource Direct" "reagentsourcedirect.net" "Paid by wire, nothing arrived, support stopped replying after two weeks.")
A=$(printf '%s' "$R1" | jq_ '"ok" if d.get("id") else "no-id"')
check "file a report" "$A" "ok"

R2=$(post_report "Reagent Source Direct Ltd" "www.reagentsourcedirect.net" "Same site, same story. Wire transfer, no goods.")
A=$(printf '%s' "$R2" | jq_ 'd.get("duplicate")')
check "exact domain attaches as supporting account" "$A" "True"

clear_limits
# Same name once normalised, different domain: must stay a separate report and
# be flagged for a human, never silently merged.
R3=$(post_report "reagentsource   direct!" "totally-different-domain.example" "Same trading name, different site entirely.")
A=$(printf '%s' "$R3" | jq_ '"flagged" if d.get("possibleMatch") else "not-flagged"')
check "same name + different domain flagged for review" "$A" "flagged"
A=$(printf '%s' "$R3" | jq_ 'd.get("duplicate")')
check "  ...and was not merged into the original" "$A" "False"

clear_limits
R4=$(post_report "Sensitive Screen Test" "screentest.example" "Call me on +1 415 555 0134 or write to 221 Baker Street about the refund.")
A=$(printf '%s' "$R4" | jq_ 'd.get("pendingReview")')
check "sensitive content routed to pending review" "$A" "True"
clear_limits

echo ""
echo "── Reading the board ───────────────────────────────────────────────────"

LIST=$(c "$BASE/api/reports")
# Two published parents: the exact-domain report became a supporting account and
# the sensitive one is held in review, so neither shows on the public board.
A=$(printf '%s' "$LIST" | jq_ 'len(d.get("reports",[]))')
check "published reports visible, pending excluded" "$A" "2"

RID=$(printf '%s' "$LIST" | jq_ 'd["reports"][-1]["id"]')
A=$(c -o /dev/null -w '%{http_code}' "$BASE/api/reports/$RID")
check "report detail loads" "$A" "200"

echo ""
echo "── Confirmations, comments, flags ──────────────────────────────────────"

CONF=$(c -X POST "$BASE/api/reports/$RID/confirm" -H 'content-type: application/json' -d '{"browserToken":"smoke-token-alpha"}')
A=$(printf '%s' "$CONF" | jq_ '"ok" if not d.get("error") else d["error"]')
check "confirm a report" "$A" "ok"

A=$(c -o /dev/null -w '%{http_code}' -X POST "$BASE/api/reports/$RID/confirm" -H 'content-type: application/json' -d '{"browserToken":"smoke-token-alpha"}')
check "same browser cannot confirm twice" "$A" "409"

TS=$(past)
CM=$(c -X POST "$BASE/api/reports/$RID/comments" -H 'content-type: application/json' \
  -d "{\"comment\":\"I had the same experience in March.\",\"nickname\":\"Wary Badger\",\"company\":\"\",\"startedAt\":$TS}")
A=$(printf '%s' "$CM" | jq_ '"ok" if not d.get("error") else d["error"]')
check "post a comment" "$A" "ok"

CID=$(c "$BASE/api/reports/$RID" | jq_ 'd.get("comments",[{}])[0].get("id","")')
A=$(c -o /dev/null -w '%{http_code}' -X POST "$BASE/api/comments/$CID/flag" -H 'content-type: application/json' -d '{"browserToken":"smoke-token-beta"}')
check "flag a comment" "$A" "200"
A=$(c -o /dev/null -w '%{http_code}' -X POST "$BASE/api/comments/$CID/flag" -H 'content-type: application/json' -d '{"browserToken":"smoke-token-beta"}')
check "same browser cannot flag twice" "$A" "409"

echo ""
echo "── Contact queue ───────────────────────────────────────────────────────"

for cat in removal correction dispute conduct security general; do
  clear_limits
  TS=$(past)
  A=$(c -o /dev/null -w '%{http_code}' -X POST "$BASE/api/disputes" -H 'content-type: application/json' \
    -d "{\"category\":\"$cat\",\"message\":\"Smoke test for the $cat category.\",\"contactInfo\":\"\",\"reportId\":\"\",\"company\":\"\",\"startedAt\":$TS}")
  check "contact category: $cat" "$A" "201"
done

clear_limits
TS=$(past)
A=$(c -o /dev/null -w '%{http_code}' -X POST "$BASE/api/disputes" -H 'content-type: application/json' \
  -d "{\"category\":\"nonsense\",\"message\":\"Should be rejected.\",\"company\":\"\",\"startedAt\":$TS}")
check "bogus category rejected" "$A" "400"

echo ""
echo "── Abuse controls ──────────────────────────────────────────────────────"

clear_limits; TS=$(past)
A=$(report_code "Bot" "bot.example" "Filled by a bot." "Acme Inc" "$TS")
check "honeypot field blocks submission" "$A" "400"

clear_limits; TS=$(now)
A=$(report_code "Speedy" "speedy.example" "Submitted instantly." "" "$TS")
check "too-fast submission blocked" "$A" "400"

clear_limits; TS=$(past); BIG=$(python3 -c 'print("x"*40000)')
A=$(report_code "Big" "big.example" "$BIG" "" "$TS")
check "oversized body rejected" "$A" "400"

clear_limits; TS=$(past)
A=$(report_code "Bad URL" "javascript:alert(1)" "Not an http url." "" "$TS")
check "non-http website rejected" "$A" "400"

clear_limits
RL=""
for i in 1 2 3 4 5 6; do
  TS=$(past)
  RL=$(report_code "Flood $i" "flood$i.example" "Rate limit probe number $i." "" "$TS")
done
check "report rate limit engages" "$RL" "429"

echo ""
echo "── Admin ───────────────────────────────────────────────────────────────"

clear_limits
A=$(c -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/login" -H 'content-type: application/json' -d '{"password":"definitely-not-it"}')
check "admin rejects a wrong password" "$A" "401"

A=$(c -o /dev/null -w '%{http_code}' "$BASE/api/admin/moderate")
check "moderation data requires auth" "$A" "401"

clear_limits
A=$(c -c "$JAR" -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/login" -H 'content-type: application/json' -d "{\"password\":\"$ADMIN_PASSWORD\"}")
check "admin login succeeds" "$A" "200"

DATA=$(c -b "$JAR" "$BASE/api/admin/moderate")
A=$(printf '%s' "$DATA" | jq_ '"ok" if "reports" in d else "missing"')
check "moderation queue loads" "$A" "ok"
A=$(printf '%s' "$DATA" | jq_ 'len(d.get("disputes",[]))')
check "contact queue holds all 6 categories" "$A" "6"
A=$(printf '%s' "$DATA" | jq_ 'd["disputes"][0]["category"]')
check "security sorts to top of queue" "$A" "security"
A=$(printf '%s' "$DATA" | jq_ '"yes" if any(r.get("publication_state")=="pending_review" for r in d.get("reports",[])) else "no"')
check "pending-review report is in the queue" "$A" "yes"

CSRF=$(grep placard_csrf "$JAR" | awk '{print $7}')
A=$([ -n "$CSRF" ] && echo present || echo missing)
check "csrf cookie issued" "$A" "present"

A=$(c -b "$JAR" -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/moderate" -H 'content-type: application/json' \
  -d '{"action":"publish-report","id":"00000000-0000-0000-0000-000000000000"}')
check "write without csrf token is refused" "$A" "403"

DID=$(printf '%s' "$DATA" | jq_ 'd["disputes"][0]["id"]')
A=$(c -b "$JAR" -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/moderate" \
  -H 'content-type: application/json' -H "x-csrf-token: $CSRF" \
  -d "{\"action\":\"resolve-dispute\",\"id\":\"$DID\",\"resolutionType\":\"no_action\",\"note\":\"Smoke test resolution.\"}")
check "resolve a contact request" "$A" "200"

A=$(pg -c "SELECT resolved FROM dispute_requests WHERE id='$DID';")
check "  ...and it is resolved in the database" "$A" "t"
A=$(pg -c "SELECT count(*) FROM moderation_events WHERE action='resolve-dispute';")
check "  ...and an audit event was written" "$A" "1"

# Publishing the held report must actually move it onto the public board.
# Counts are compared as deltas: the rate-limit section above deliberately files
# extra reports, so any absolute total here would be brittle bookkeeping.
BEFORE=$(c "$BASE/api/reports" | jq_ 'len(d.get("reports",[]))')
PRID=$(printf '%s' "$DATA" | jq_ 'next(r["id"] for r in d["reports"] if r.get("publication_state")=="pending_review")')
A=$(c -b "$JAR" -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/moderate" \
  -H 'content-type: application/json' -H "x-csrf-token: $CSRF" \
  -d "{\"action\":\"publish-report\",\"id\":\"$PRID\"}")
check "publish a held report" "$A" "200"
AFTER=$(c "$BASE/api/reports" | jq_ 'len(d.get("reports",[]))')
check "  ...and it now appears on the board" "$((AFTER - BEFORE))" "1"

A=$(c -b "$JAR" -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/moderate" \
  -H 'content-type: application/json' -H "x-csrf-token: $CSRF" \
  -d "{\"action\":\"remove-report\",\"id\":\"$PRID\"}")
check "remove a report" "$A" "200"
FINAL=$(c "$BASE/api/reports" | jq_ 'len(d.get("reports",[]))')
check "  ...and it leaves the board" "$((AFTER - FINAL))" "1"
A=$(pg -c "SELECT count(*) FROM reports WHERE id='$PRID';")
check "  ...but is soft-deleted, not erased" "$A" "1"
A=$(pg -c "SELECT removed_at IS NOT NULL FROM reports WHERE id='$PRID';")
check "  ...with a removal timestamp" "$A" "t"

A=$(c -b "$JAR" -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/logout")
check "logout without csrf refused" "$A" "403"
A=$(c -b "$JAR" -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/logout" -H "x-csrf-token: $CSRF")
check "admin logout" "$A" "200"
A=$(c -b "$JAR" -o /dev/null -w '%{http_code}' "$BASE/api/admin/moderate")
check "session dead after logout" "$A" "401"

echo ""
echo "── Headers & hygiene ───────────────────────────────────────────────────"

H=$(c -sI "$BASE/")
for h in content-security-policy x-frame-options strict-transport-security x-content-type-options referrer-policy; do
  A=$(printf '%s' "$H" | grep -ic "^$h:")
  check "header: $h" "$A" "1"
done
A=$(printf '%s' "$H" | grep -ic '^server:')
check "server header suppressed" "$A" "0"
A=$(c "$BASE/robots.txt" | grep -c '/admin')
check "admin disallowed in robots.txt" "$A" "1"
A=$(c -o /dev/null -w '%{http_code}' "$BASE/sitemap.xml")
check "sitemap serves" "$A" "200"
A=$(c "$BASE/" | grep -c 'googleapis\|gstatic\|cdnjs')
check "no third-party asset references" "$A" "0"
A=$(c -o /dev/null -w '%{http_code}' "$BASE/dispute")
check "/dispute redirects for old links" "$A" "307"
A=$(c -L -o /dev/null -w '%{url_effective}' "$BASE/dispute?report=abc")
check "  ...preserving the report reference" "$A" "$BASE/contact?report=abc"

echo ""
echo "════════════════════════════════════════════════════════════════════════"
printf "  passed %d   failed %d\n" "$PASS" "$FAIL"
echo "════════════════════════════════════════════════════════════════════════"
[ "$FAIL" -eq 0 ]
