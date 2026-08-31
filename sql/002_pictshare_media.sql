ALTER TABLE media ADD COLUMN IF NOT EXISTS remote_hash VARCHAR(255) NULL AFTER storage_key;
ALTER TABLE media ADD COLUMN IF NOT EXISTS remote_url VARCHAR(2048) NULL AFTER remote_hash;
ALTER TABLE media ADD INDEX IF NOT EXISTS idx_media_remote_hash (remote_hash);
