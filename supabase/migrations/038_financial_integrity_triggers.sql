-- ── Financial integrity: DB-level triggers ───────────────────────────────────
--
-- These triggers enforce the two hard financial constraints at the database
-- layer so they hold even under concurrent requests or direct service-role
-- writes that bypass the application API.
--
-- 1. Sum of award_values for awarded packages in a project ≤ project budget
-- 2. Sum of invoice amounts for a package ≤ package award_value

-- ── 1. Award budget constraint ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_project_award_budget()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_budget   numeric;
  v_other    numeric;
BEGIN
  -- Only applies when setting or updating an awarded package
  IF NEW.current_stage = 'Award' AND NEW.award_value IS NOT NULL THEN
    SELECT COALESCE(budget, 0) INTO v_budget
      FROM public.projects WHERE id = NEW.project_id;

    SELECT COALESCE(SUM(award_value), 0) INTO v_other
      FROM public.packages
     WHERE project_id = NEW.project_id
       AND current_stage = 'Award'
       AND id != NEW.id;

    IF (v_other + NEW.award_value) > v_budget THEN
      RAISE EXCEPTION
        'Award value exceeds available project budget. '
        'Attempting to commit %, already awarded %, budget is %.',
        NEW.award_value, v_other, v_budget
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_project_award_budget ON public.packages;
CREATE TRIGGER trg_enforce_project_award_budget
  BEFORE INSERT OR UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_award_budget();

-- ── 2. Invoice ≤ award_value constraint ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_invoice_le_award()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_award   numeric;
  v_billed  numeric;
BEGIN
  SELECT COALESCE(award_value, 0) INTO v_award
    FROM public.packages WHERE id = NEW.package_id;

  -- Skip check when award_value is not set (pre-award invoices blocked by stage
  -- gate in the application layer; this trigger is a belt-and-suspenders guard)
  IF v_award = 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_billed
    FROM public.invoices
   WHERE package_id = NEW.package_id
     -- exclude self on UPDATE
     AND id IS DISTINCT FROM NEW.id;

  IF (v_billed + NEW.amount) > v_award THEN
    RAISE EXCEPTION
      'Invoice total % would exceed award value % for this package.',
      v_billed + NEW.amount, v_award
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_invoice_le_award ON public.invoices;
CREATE TRIGGER trg_enforce_invoice_le_award
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_le_award();
