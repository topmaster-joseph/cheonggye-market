-- Assertions for 20261019120000_cgma_coupon_review_log.sql. Run after fixture + migration (twice, to prove idempotence).
\set ON_ERROR_STOP on
DO $$
DECLARE n int; r jsonb; ok boolean;
BEGIN
  -- 1. backfill: exactly one 'submitted' row per pre-existing application
  SELECT count(*) INTO n FROM cgma_festival_2026_coupon_review_log WHERE event='submitted';
  ASSERT n = 2, 'backfill expected 2 submitted rows, got '||n;

  -- 2. new application logs itself via trigger
  INSERT INTO cgma_festival_2026_coupon_merchant(receipt,event_id,shop_name,phone,location_text,items,accepts_coupon_5000,privacy_consented_at)
  VALUES ('00000000-0000-4000-8000-000000000003','cgma-du-dream-2026','테스트상점C','01000000003','청계면 테스트길 3','치킨',true,now());
  SELECT count(*) INTO n FROM cgma_festival_2026_coupon_review_log WHERE receipt='00000000-0000-4000-8000-000000000003' AND event='submitted';
  ASSERT n = 1, 'insert trigger did not log';

  -- 3. RPC approves and records actor + from/to
  r := cgma_festival_2026_coupon_review('00000000-0000-4000-8000-000000000001','approved','11111111-1111-4111-8111-111111111111','admin@example.org');
  ASSERT (r->>'changed')::boolean, 'expected changed';
  SELECT count(*) INTO n FROM cgma_festival_2026_coupon_review_log
   WHERE receipt='00000000-0000-4000-8000-000000000001' AND event='review' AND from_state='pending' AND to_state='approved'
     AND actor_id='11111111-1111-4111-8111-111111111111' AND actor_email='admin@example.org';
  ASSERT n = 1, 'review log missing actor';

  -- 4. same-state review is a no-op (no duplicate log)
  r := cgma_festival_2026_coupon_review('00000000-0000-4000-8000-000000000001','approved',NULL,NULL);
  ASSERT NOT (r->>'changed')::boolean, 'same state should not change';
  SELECT count(*) INTO n FROM cgma_festival_2026_coupon_review_log WHERE receipt='00000000-0000-4000-8000-000000000001' AND event='review';
  ASSERT n = 1, 'duplicate review log';

  -- 5. invalid state and unknown receipt fail
  BEGIN PERFORM cgma_festival_2026_coupon_review('00000000-0000-4000-8000-000000000002','bogus',NULL,NULL); ok:=false;
  EXCEPTION WHEN others THEN ok := SQLERRM='invalid_state'; END;
  ASSERT ok, 'invalid state accepted';
  BEGIN PERFORM cgma_festival_2026_coupon_review('00000000-0000-4000-8000-0000000000ff','approved',NULL,NULL); ok:=false;
  EXCEPTION WHEN others THEN ok := SQLERRM='not_found'; END;
  ASSERT ok, 'unknown receipt accepted';

  -- 6. direct SQL state change (bypassing RPC) is still audited, actor unknown
  UPDATE cgma_festival_2026_coupon_merchant SET review_state='rejected' WHERE receipt='00000000-0000-4000-8000-000000000002';
  SELECT count(*) INTO n FROM cgma_festival_2026_coupon_review_log WHERE receipt='00000000-0000-4000-8000-000000000002' AND event='review' AND actor_id IS NULL;
  ASSERT n = 1, 'direct update not audited';

  -- 7. the actor of step 3 (same transaction) must not leak into the direct update of step 6
  ASSERT current_setting('cgma.coupon_actor_id', true) = '', 'actor setting leaked after RPC';

  -- 8. log is immutable
  BEGIN UPDATE cgma_festival_2026_coupon_review_log SET to_state='approved'; ok:=false;
  EXCEPTION WHEN others THEN ok := SQLERRM='coupon_review_log_immutable'; END;
  ASSERT ok, 'log update allowed';
  BEGIN DELETE FROM cgma_festival_2026_coupon_review_log; ok:=false;
  EXCEPTION WHEN others THEN ok := SQLERRM='coupon_review_log_immutable'; END;
  ASSERT ok, 'log delete allowed';

  -- 9. public view exposes only approved rows and no PII columns
  SELECT count(*) INTO n FROM cgma_festival_2026_coupon_public;
  ASSERT n = 1, 'public view should show exactly 1 approved shop, got '||n;
  SELECT count(*) INTO n FROM information_schema.columns
   WHERE table_name='cgma_festival_2026_coupon_public' AND column_name IN ('phone','receipt','privacy_consented_at');
  ASSERT n = 0, 'public view exposes PII columns';

  -- 10. privileges: anon/authenticated cannot read log, view, or call RPC
  ASSERT NOT has_table_privilege('anon','public.cgma_festival_2026_coupon_review_log','SELECT'), 'anon can read log';
  ASSERT NOT has_table_privilege('authenticated','public.cgma_festival_2026_coupon_public','SELECT'), 'authenticated can read view directly';
  ASSERT NOT has_function_privilege('anon','public.cgma_festival_2026_coupon_review(uuid,text,uuid,text)','EXECUTE'), 'anon can call RPC';
  ASSERT has_function_privilege('service_role','public.cgma_festival_2026_coupon_review(uuid,text,uuid,text)','EXECUTE'), 'service_role cannot call RPC';
END $$;

-- 11. retention: deleting an application cascades its history (separate transaction)
DELETE FROM cgma_festival_2026_coupon_merchant WHERE receipt='00000000-0000-4000-8000-000000000003';
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM cgma_festival_2026_coupon_review_log WHERE receipt='00000000-0000-4000-8000-000000000003';
  ASSERT n = 0, 'cascade delete of history failed';
END $$;
SELECT 'ALL COUPON REVIEW LOG ASSERTIONS PASSED' AS result;
