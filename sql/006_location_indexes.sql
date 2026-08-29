ALTER TABLE locations ADD INDEX IF NOT EXISTS idx_locations_level_parent_name (level, parent_code, name);
