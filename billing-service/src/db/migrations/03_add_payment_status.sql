ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed' NOT NULL;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS check_payment_status;
ALTER TABLE payments ADD CONSTRAINT check_payment_status CHECK (status IN ('completed', 'refunded'));
