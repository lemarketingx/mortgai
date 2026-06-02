-- Ensure each lead can only be purchased once (exclusive model).
-- Safe to run multiple times (IF NOT EXISTS).
ALTER TABLE lead_purchases
  ADD CONSTRAINT IF NOT EXISTS lead_purchases_lead_id_unique UNIQUE (lead_id);
