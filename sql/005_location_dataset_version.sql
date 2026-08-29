ALTER TABLE locations ADD COLUMN IF NOT EXISTS dataset_version VARCHAR(80) NOT NULL DEFAULT 'legacy' AFTER parent_code;
