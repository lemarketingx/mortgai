-- Advisor wallet balances
CREATE TABLE IF NOT EXISTS advisor_wallets (
  advisor_id   TEXT        PRIMARY KEY,
  balance      NUMERIC     NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configurable lead pricing by quality tier
CREATE TABLE IF NOT EXISTS lead_pricing_config (
  quality      TEXT        PRIMARY KEY,
  price_ils    NUMERIC     NOT NULL DEFAULT 0 CHECK (price_ils >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default 3-tier pricing
INSERT INTO lead_pricing_config (quality, price_ils) VALUES
  ('חם',     250),
  ('בינוני', 150),
  ('חלש',    75)
ON CONFLICT (quality) DO NOTHING;

-- Atomic wallet deduction with row-level lock (prevents double-spend race conditions)
CREATE OR REPLACE FUNCTION deduct_wallet_balance(p_advisor_id TEXT, p_amount NUMERIC)
RETURNS TABLE (success BOOLEAN, new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT balance INTO v_balance
  FROM advisor_wallets
  WHERE advisor_id = p_advisor_id
  FOR UPDATE;

  IF NOT FOUND OR v_balance IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_balance < p_amount THEN
    RETURN QUERY SELECT FALSE, v_balance;
    RETURN;
  END IF;

  UPDATE advisor_wallets
    SET balance    = balance - p_amount,
        updated_at = NOW()
  WHERE advisor_id = p_advisor_id;

  RETURN QUERY SELECT TRUE, (v_balance - p_amount)::NUMERIC;
END;
$$;

-- Wallet top-up (insert or increment)
CREATE OR REPLACE FUNCTION top_up_wallet(p_advisor_id TEXT, p_amount NUMERIC)
RETURNS TABLE (new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO advisor_wallets (advisor_id, balance, created_at, updated_at)
  VALUES (p_advisor_id, p_amount, NOW(), NOW())
  ON CONFLICT (advisor_id) DO UPDATE
    SET balance    = advisor_wallets.balance + p_amount,
        updated_at = NOW();

  RETURN QUERY SELECT balance FROM advisor_wallets WHERE advisor_id = p_advisor_id;
END;
$$;
