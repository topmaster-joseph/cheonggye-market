#!/usr/bin/env bash
# Runs the coupon review-log migration against a throwaway Postgres:
# fixture → migration ×2 (idempotence) → assertions → rollback (original applications must survive).
# Requires: PGHOST/PGPORT/PGUSER pointing at a disposable server (CI uses a postgres service container).
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="cgma_coupon_log_test_$$"
P=(psql -v ON_ERROR_STOP=1 -q -X)
"${P[@]}" -d postgres -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
trap '"${P[@]}" -d postgres -c "DROP DATABASE IF EXISTS $DB" >/dev/null 2>&1 || true' EXIT
M=supabase/migrations/20261019120000_cgma_coupon_review_log.sql
"${P[@]}" -d "$DB" -f supabase/tests/coupon_review_log.fixture.sql
"${P[@]}" -d "$DB" -f "$M" 2>/dev/null
"${P[@]}" -d "$DB" -f "$M" 2>/dev/null
"${P[@]}" -d "$DB" -f supabase/tests/coupon_review_log.test.sql
"${P[@]}" -d "$DB" -f supabase/migrations/20261019120000_cgma_coupon_review_log.rollback.sql 2>/dev/null
left=$("${P[@]}" -d "$DB" -tAc "SELECT count(*) FROM public.cgma_festival_2026_coupon_merchant")
log=$("${P[@]}" -d "$DB" -tAc "SELECT to_regclass('public.cgma_festival_2026_coupon_review_log') IS NULL")
[ "$left" = "2" ] && [ "$log" = "t" ] || { echo "rollback check failed: applications=$left log_removed=$log"; exit 1; }
echo "PASS rollback keeps $left applications and removes the history objects"
