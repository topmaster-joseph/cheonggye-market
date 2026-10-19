-- CGMA 2026 두:드림 축제 — 5천원 쿠폰 상가 심사 이력(append-only)과 원자적 심사 RPC.
-- Supabase project: renzehysxirjilvdxacv (EKODI production). Additive only.
-- Rollback: see 20261019120000_cgma_coupon_review_log.rollback.sql

CREATE TABLE IF NOT EXISTS public.cgma_festival_2026_coupon_review_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  receipt uuid NOT NULL REFERENCES public.cgma_festival_2026_coupon_merchant(receipt) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('submitted','review')),
  from_state text CHECK (from_state IS NULL OR from_state IN ('pending','approved','rejected')),
  to_state text NOT NULL CHECK (to_state IN ('pending','approved','rejected')),
  actor_id uuid,
  actor_email text CHECK (actor_email IS NULL OR length(actor_email) <= 254),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cgma_festival_2026_coupon_review_log_receipt
  ON public.cgma_festival_2026_coupon_review_log (receipt, created_at DESC);

ALTER TABLE public.cgma_festival_2026_coupon_review_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cgma_festival_2026_coupon_review_log FROM anon, authenticated;
GRANT SELECT, INSERT ON public.cgma_festival_2026_coupon_review_log TO service_role;

-- 이력은 수정 불가. 삭제는 원본 신청 삭제(보존기간 만료)에 따른 CASCADE만 허용.
CREATE OR REPLACE FUNCTION public.cgma_festival_2026_coupon_log_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'coupon_review_log_immutable' USING ERRCODE = 'P0001'; END IF;
  IF pg_trigger_depth() < 2 THEN RAISE EXCEPTION 'coupon_review_log_immutable' USING ERRCODE = 'P0001'; END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS cgma_festival_2026_coupon_log_immutable ON public.cgma_festival_2026_coupon_review_log;
CREATE TRIGGER cgma_festival_2026_coupon_log_immutable
  BEFORE UPDATE OR DELETE ON public.cgma_festival_2026_coupon_review_log
  FOR EACH ROW EXECUTE FUNCTION public.cgma_festival_2026_coupon_log_immutable();

-- 신청 접수·상태 변경을 모든 경로(API·직접 SQL)에서 자동 기록.
CREATE OR REPLACE FUNCTION public.cgma_festival_2026_coupon_log_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_actor uuid := nullif(current_setting('cgma.coupon_actor_id', true), '')::uuid;
  v_email text := nullif(current_setting('cgma.coupon_actor_email', true), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.cgma_festival_2026_coupon_review_log(receipt, event, from_state, to_state, created_at)
    VALUES (NEW.receipt, 'submitted', NULL, NEW.review_state, NEW.created_at);
  ELSIF NEW.review_state IS DISTINCT FROM OLD.review_state THEN
    INSERT INTO public.cgma_festival_2026_coupon_review_log(receipt, event, from_state, to_state, actor_id, actor_email)
    VALUES (NEW.receipt, 'review', OLD.review_state, NEW.review_state, v_actor, v_email);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cgma_festival_2026_coupon_log_change ON public.cgma_festival_2026_coupon_merchant;
CREATE TRIGGER cgma_festival_2026_coupon_log_change
  AFTER INSERT OR UPDATE OF review_state ON public.cgma_festival_2026_coupon_merchant
  FOR EACH ROW EXECUTE FUNCTION public.cgma_festival_2026_coupon_log_change();

-- 관리자 심사: 상태 변경과 이력 기록을 한 트랜잭션에서 처리(Edge Function service_role 전용).
CREATE OR REPLACE FUNCTION public.cgma_festival_2026_coupon_review(
  p_receipt uuid, p_state text, p_actor_id uuid, p_actor_email text)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_prev text;
BEGIN
  IF p_state NOT IN ('pending','approved','rejected') THEN RAISE EXCEPTION 'invalid_state' USING ERRCODE = 'P0001'; END IF;
  SELECT review_state INTO v_prev FROM public.cgma_festival_2026_coupon_merchant
    WHERE receipt = p_receipt AND event_id = 'cgma-du-dream-2026' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001'; END IF;
  IF v_prev = p_state THEN RETURN jsonb_build_object('ok', true, 'changed', false, 'state', p_state); END IF;
  PERFORM set_config('cgma.coupon_actor_id', coalesce(p_actor_id::text, ''), true);
  PERFORM set_config('cgma.coupon_actor_email', coalesce(left(p_actor_email, 254), ''), true);
  UPDATE public.cgma_festival_2026_coupon_merchant
    SET review_state = p_state, updated_at = now() WHERE receipt = p_receipt;
  -- 같은 트랜잭션의 이후 변경에 행위자가 잘못 기록되지 않도록 즉시 해제
  PERFORM set_config('cgma.coupon_actor_id', '', true);
  PERFORM set_config('cgma.coupon_actor_email', '', true);
  RETURN jsonb_build_object('ok', true, 'changed', true, 'from', v_prev, 'state', p_state);
END $$;
REVOKE ALL ON FUNCTION public.cgma_festival_2026_coupon_review(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cgma_festival_2026_coupon_review(uuid, text, uuid, text) TO service_role;

-- 공개 목록: 승인 상가의 상호·위치·품목만. 연락처·접수번호·신청자 정보 제외.
CREATE OR REPLACE VIEW public.cgma_festival_2026_coupon_public
WITH (security_invoker = true) AS
  SELECT shop_name, location_text, items, updated_at AS approved_at
  FROM public.cgma_festival_2026_coupon_merchant
  WHERE event_id = 'cgma-du-dream-2026' AND review_state = 'approved';
REVOKE ALL ON public.cgma_festival_2026_coupon_public FROM anon, authenticated;
GRANT SELECT ON public.cgma_festival_2026_coupon_public TO service_role;

-- 기존 신청(트리거 도입 전 접수분) 접수 이력 백필. 재실행해도 중복되지 않음.
INSERT INTO public.cgma_festival_2026_coupon_review_log(receipt, event, from_state, to_state, created_at)
SELECT m.receipt, 'submitted', NULL, 'pending', m.created_at
FROM public.cgma_festival_2026_coupon_merchant m
WHERE NOT EXISTS (SELECT 1 FROM public.cgma_festival_2026_coupon_review_log l
                  WHERE l.receipt = m.receipt AND l.event = 'submitted');
