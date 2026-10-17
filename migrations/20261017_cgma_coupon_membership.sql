-- Task: cgma-coupon-membership-20261017
-- Additive and reversible: retain existing coupon submissions with NULL historical membership.
-- Run before deploying the membership-aware cgma-festival-intake Edge function.
ALTER TABLE public.cgma_festival_2026_coupon_merchant
  ADD COLUMN IF NOT EXISTS membership_choice TEXT
  CHECK (membership_choice IN ('regular','joining'));
COMMENT ON COLUMN public.cgma_festival_2026_coupon_merchant.membership_choice IS
  'Self-declared CGMA regular membership or intention to apply. Not proof of approved membership.';
