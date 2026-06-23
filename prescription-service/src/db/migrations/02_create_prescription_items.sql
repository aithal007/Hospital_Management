CREATE TABLE IF NOT EXISTS prescription_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  duration_days INTEGER NOT NULL,
  CONSTRAINT check_duration_days CHECK (duration_days > 0)
);
