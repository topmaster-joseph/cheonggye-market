-- CGMA AI education: move the first class to Friday 2026-11-13 (8 sessions unchanged).
-- Non-destructive, conditional backfill: do not override changes made by the site admin.
-- Deploy using the authorized EKODI migration lane, not direct production SQL access.
UPDATE public.cgma_programs
   SET period_label = '11.13(금) – 12.23(수) · 회당 2시간',
       starts_on = DATE '2026-11-13',
       ends_on = DATE '2026-12-23',
       updated_at = NOW()
 WHERE slug = 'ai-marketing-2026'
   AND starts_on = DATE '2026-11-06'
   AND ends_on = DATE '2026-12-18';
