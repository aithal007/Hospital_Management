CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
