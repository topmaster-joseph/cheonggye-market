-- Rollback for 20261019120000_cgma_coupon_review_log.sql.
-- 신청 원본(cgma_festival_2026_coupon_merchant)은 건드리지 않는다. 이력만 제거된다.
-- 실행 전 이력 보존이 필요하면 먼저 내보낼 것:
--   SELECT * FROM public.cgma_festival_2026_coupon_review_log ORDER BY id;
DROP TRIGGER IF EXISTS cgma_festival_2026_coupon_log_change ON public.cgma_festival_2026_coupon_merchant;
DROP FUNCTION IF EXISTS public.cgma_festival_2026_coupon_log_change();
DROP FUNCTION IF EXISTS public.cgma_festival_2026_coupon_review(uuid, text, uuid, text);
DROP VIEW IF EXISTS public.cgma_festival_2026_coupon_public;
DROP TRIGGER IF EXISTS cgma_festival_2026_coupon_log_immutable ON public.cgma_festival_2026_coupon_review_log;
DROP TABLE IF EXISTS public.cgma_festival_2026_coupon_review_log;
DROP FUNCTION IF EXISTS public.cgma_festival_2026_coupon_log_immutable();
