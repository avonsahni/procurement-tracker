-- 018_razorpay_subscriptions.sql
-- Adds Razorpay subscription tracking fields to organizations.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id text,
  ADD COLUMN IF NOT EXISTS razorpay_customer_id      text,
  ADD COLUMN IF NOT EXISTS billing_period            text
    CHECK (billing_period IN ('monthly', 'annual')),
  ADD COLUMN IF NOT EXISTS current_period_end        timestamptz,
  ADD COLUMN IF NOT EXISTS price_inr_annual          numeric(14,2);

-- Add annual price column to plan_pricing so platform admin can set it separately
ALTER TABLE public.plan_pricing
  ADD COLUMN IF NOT EXISTS price_inr_annual numeric(14,2);

-- Default annual = monthly * 10  (2 months free)
UPDATE public.plan_pricing
  SET price_inr_annual = price_inr * 10
  WHERE price_inr_annual IS NULL;
