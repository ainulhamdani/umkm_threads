UPDATE location_dataset_metadata
SET active = FALSE
WHERE active = TRUE
  AND id NOT IN (
    SELECT id
    FROM (
      SELECT MAX(id) AS id
      FROM location_dataset_metadata
      WHERE active = TRUE
    ) AS latest_active
  );

ALTER TABLE location_dataset_metadata
  ADD COLUMN IF NOT EXISTS active_key TINYINT GENERATED ALWAYS AS (IF(active = TRUE, 1, NULL)) STORED;

ALTER TABLE location_dataset_metadata
  ADD UNIQUE INDEX IF NOT EXISTS uq_location_metadata_active (active_key);
