-- 015_plan_pricing_coupons.sql
-- Plan pricing (super-admin managed) and promotional coupons.

CREATE TABLE IF NOT EXISTS public.plan_pricing (
  tier        text PRIMARY KEY CHECK (tier IN ('trial','starter','pro','enterprise')),
  price_inr   numeric(14,2) NOT NULL DEFAULT 0,
  period      text NOT NULL DEFAULT 'month',
  description text,
  updated_at  timestamptz DEFAULT now(),
  updated_by  text
);

INSERT INTO public.plan_pricing (tier, price_inr, period, description) VALUES
  ('trial',      0, '14 days', '14-day free trial — no credit card needed'),
  ('starter',    0, 'month',   'Up to 10 team members'),
  ('pro',        0, 'month',   'Up to 50 team members'),
  ('enterprise', 0, 'month',   'Unlimited team members')
ON CONFLICT (tier) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.coupons (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  code         text    NOT NULL UNIQUE,
  type         text    NOT NULL CHECK (type IN ('free','discount')),
  -- discount fields (used when type='discount')
  discount_pct integer CHECK (discount_pct BETWEEN 1 AND 100),
  -- free fields (used when type='free')
  free_plan    text    CHECK (free_plan IN ('starter','pro','enterprise')),
  -- common
  valid_days   integer NOT NULL DEFAULT 30 CHECK (valid_days > 0),
  max_uses     integer CHECK (max_uses > 0),   -- NULL = unlimited
  used_count   integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  expires_at   timestamptz,
  notes        text,
  created_by   text,
  created_at   timestamptz DEFAULT now()
);

-- Track which coupon an org applied at signup
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS coupon_code text;

ALTER TABLE public.plan_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_pricing_read_all" ON public.plan_pricing FOR SELECT USING (true);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
-- coupons are only accessible via service_role (admin client) — no public RLS needed

COMMENT ON TABLE public.plan_pricing IS 'Platform-managed per-tier pricing in INR.';
COMMENT ON TABLE public.coupons      IS 'Promotional coupons — free plan grants or discounts.';
COMMENT ON COLUMN public.organizations.coupon_code IS 'Coupon code applied at registration.';
