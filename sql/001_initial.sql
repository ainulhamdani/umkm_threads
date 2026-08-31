CREATE TABLE IF NOT EXISTS sellers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone_e164 VARCHAR(20) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  pin_reset_required BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sellers_phone (phone_e164)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS locations (
  code VARCHAR(20) NOT NULL,
  level ENUM('PROVINCE', 'CITY_REGENCY', 'DISTRICT') NOT NULL,
  name VARCHAR(160) NOT NULL,
  parent_code VARCHAR(20) NULL,
  dataset_version VARCHAR(80) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (code),
  KEY idx_locations_level_parent (level, parent_code),
  KEY idx_locations_level_parent_name (level, parent_code, name),
  CONSTRAINT fk_locations_parent FOREIGN KEY (parent_code) REFERENCES locations(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS location_dataset_metadata (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_url VARCHAR(500) NOT NULL,
  snapshot_url VARCHAR(500) NOT NULL,
  retrieved_at DATE NOT NULL,
  dataset_version VARCHAR(80) NOT NULL,
  checksum_sha256 CHAR(64) NOT NULL,
  row_count INT UNSIGNED NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  active_key TINYINT GENERATED ALWAYS AS (IF(active = TRUE, 1, NULL)) STORED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_location_metadata_active (active_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  storage_key VARCHAR(255) NOT NULL,
  remote_hash VARCHAR(255) NULL,
  remote_url VARCHAR(2048) NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  width SMALLINT UNSIGNED NOT NULL,
  height SMALLINT UNSIGNED NOT NULL,
  alt_text VARCHAR(255) NOT NULL,
  owner_type ENUM('SELLER', 'SUPERADMIN') NOT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_media_storage_key (storage_key),
  KEY idx_media_remote_hash (remote_hash),
  KEY idx_media_owner (owner_type, owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shops (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  profile_media_id BIGINT UNSIGNED NULL,
  province_code VARCHAR(20) NOT NULL,
  city_regency_code VARCHAR(20) NOT NULL,
  district_code VARCHAR(20) NOT NULL,
  address_detail VARCHAR(500) NOT NULL,
  visibility_status ENUM('PUBLISHED', 'HIDDEN') NOT NULL DEFAULT 'PUBLISHED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_shops_seller (seller_id),
  UNIQUE KEY uq_shops_slug (slug),
  KEY idx_shops_location (province_code, city_regency_code, district_code),
  CONSTRAINT fk_shops_seller FOREIGN KEY (seller_id) REFERENCES sellers(id),
  CONSTRAINT fk_shops_profile_media FOREIGN KEY (profile_media_id) REFERENCES media(id),
  CONSTRAINT fk_shops_province FOREIGN KEY (province_code) REFERENCES locations(code),
  CONSTRAINT fk_shops_city FOREIGN KEY (city_regency_code) REFERENCES locations(code),
  CONSTRAINT fk_shops_district FOREIGN KEY (district_code) REFERENCES locations(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_categories (
  code VARCHAR(50) NOT NULL,
  label VARCHAR(120) NOT NULL,
  display_order TINYINT UNSIGNED NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (code),
  UNIQUE KEY uq_product_categories_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NOT NULL,
  media_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  price_idr DECIMAL(15, 0) UNSIGNED NOT NULL,
  description VARCHAR(1000) NULL,
  primary_category_code VARCHAR(50) NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  visibility_status ENUM('PUBLISHED', 'HIDDEN') NOT NULL DEFAULT 'PUBLISHED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_shop_status (shop_id, visibility_status, available),
  KEY idx_products_name (name),
  CONSTRAINT fk_products_shop FOREIGN KEY (shop_id) REFERENCES shops(id),
  CONSTRAINT fk_products_media FOREIGN KEY (media_id) REFERENCES media(id),
  CONSTRAINT fk_products_primary_category FOREIGN KEY (primary_category_code) REFERENCES product_categories(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_category_assignments (
  product_id BIGINT UNSIGNED NOT NULL,
  category_code VARCHAR(50) NOT NULL,
  position TINYINT UNSIGNED NOT NULL,
  role ENUM('SECONDARY') NOT NULL DEFAULT 'SECONDARY',
  PRIMARY KEY (product_id, category_code),
  UNIQUE KEY uq_product_category_position (product_id, position),
  CONSTRAINT chk_assignment_position CHECK (position IN (1, 2)),
  CONSTRAINT fk_assignments_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignments_category FOREIGN KEY (category_code) REFERENCES product_categories(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seller_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_seller_sessions_token (token_hash),
  KEY idx_seller_sessions_active (seller_id, expires_at, revoked_at),
  CONSTRAINT fk_seller_sessions_seller FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS superadmin_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_superadmin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS superadmin_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  superadmin_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_superadmin_sessions_token (token_hash),
  KEY idx_superadmin_sessions_active (superadmin_id, expires_at, revoked_at),
  CONSTRAINT fk_superadmin_sessions_user FOREIGN KEY (superadmin_id) REFERENCES superadmin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS adsense_settings (
  id TINYINT UNSIGNED NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  client_id VARCHAR(100) NULL,
  home_slot VARCHAR(100) NULL,
  shop_slot VARCHAR(100) NULL,
  seller_slot VARCHAR(100) NULL,
  admin_slot VARCHAR(100) NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_adsense_updated_by FOREIGN KEY (updated_by) REFERENCES superadmin_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_type ENUM('SELLER', 'SUPERADMIN', 'SYSTEM') NOT NULL,
  actor_id BIGINT UNSIGNED NULL,
  action_code VARCHAR(80) NOT NULL,
  target_type VARCHAR(80) NULL,
  target_id BIGINT UNSIGNED NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_created_at (created_at),
  KEY idx_audit_logs_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
