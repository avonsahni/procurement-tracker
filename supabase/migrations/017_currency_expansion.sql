-- 017_currency_expansion.sql
-- Expand supported currencies to JPY, AED, SGD.
-- Add per-org default_currency to company_info.

ALTER TABLE public.company_info
  ADD COLUMN IF NOT EXISTS default_currency text NOT NULL DEFAULT 'INR'
  CHECK (default_currency IN ('INR', 'USD', 'GBP', 'EUR', 'JPY', 'AED', 'SGD'));

-- Widen packages.currency check constraint to include the new currencies
ALTER TABLE public.packages
  DROP CONSTRAINT IF EXISTS packages_currency_check;

ALTER TABLE public.packages
  ADD CONSTRAINT packages_currency_check
  CHECK (currency IN ('INR', 'USD', 'GBP', 'EUR', 'JPY', 'AED', 'SGD'));
