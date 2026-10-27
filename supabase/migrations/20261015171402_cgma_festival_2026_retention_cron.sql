-- Recorded from production (renzehysxirjilvdxacv, supabase_migrations version 20261015171402).
-- Festival applicant personal data lives in Supabase; this pg_cron job deletes it after the
-- retention deadline. The legacy Cloudflare D1 copy was never created and its module is removed.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule(
 'cgma-festival-2026-applicant-retention',
 '12 16 * * *',
 $$DELETE FROM public.cgma_festival_2026_booth WHERE now() >= timestamptz '2027-01-28 00:00:00+09';
   DELETE FROM public.cgma_festival_2026_coupon_merchant WHERE now() >= timestamptz '2027-01-28 00:00:00+09';$$
);
