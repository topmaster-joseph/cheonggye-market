-- Local test fixture mirroring the production shape of the CGMA 2026 festival coupon tables
-- (schema read from renzehysxirjilvdxacv on 2026-10-19). Synthetic data only.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE TABLE public.cgma_festival_2026_settings (
  event_id text PRIMARY KEY, booth_open boolean NOT NULL DEFAULT true,
  coupon_open boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.cgma_festival_2026_settings(event_id) VALUES ('cgma-du-dream-2026');
CREATE TABLE public.cgma_festival_2026_coupon_merchant (
  receipt uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL REFERENCES public.cgma_festival_2026_settings(event_id),
  shop_name text NOT NULL CHECK (length(trim(shop_name)) BETWEEN 1 AND 80),
  phone text NOT NULL CHECK (phone ~ '^0[0-9]{8,10}$'),
  location_text text NOT NULL CHECK (length(trim(location_text)) BETWEEN 1 AND 200),
  items text NOT NULL CHECK (length(trim(items)) BETWEEN 1 AND 500),
  accepts_coupon_5000 boolean NOT NULL CHECK (accepts_coupon_5000 = true),
  review_state text NOT NULL DEFAULT 'pending' CHECK (review_state IN ('pending','approved','rejected')),
  privacy_consented_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX cgma_festival_2026_coupon_shop_phone_uq
  ON public.cgma_festival_2026_coupon_merchant (event_id, lower(shop_name), phone);
ALTER TABLE public.cgma_festival_2026_coupon_merchant ENABLE ROW LEVEL SECURITY;
-- Pre-existing applications (inserted before the trigger exists → exercise backfill)
INSERT INTO public.cgma_festival_2026_coupon_merchant(receipt,event_id,shop_name,phone,location_text,items,accepts_coupon_5000,privacy_consented_at,created_at)
VALUES ('00000000-0000-4000-8000-000000000001','cgma-du-dream-2026','테스트상점A','01000000001','청계면 테스트길 1','커피',true,now(),'2026-10-17T00:00:00Z'),
       ('00000000-0000-4000-8000-000000000002','cgma-du-dream-2026','테스트상점B','01000000002','청계면 테스트길 2','분식',true,now(),'2026-10-17T01:00:00Z');
