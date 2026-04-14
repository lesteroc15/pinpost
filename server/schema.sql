CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended')),
  created_at TIMESTAMP DEFAULT NOW(),
  gbp_access_token TEXT,
  gbp_refresh_token TEXT,
  gbp_account_id VARCHAR(255),
  gbp_location_id VARCHAR(255),
  gbp_location_name VARCHAR(255),
  meta_access_token TEXT,
  meta_page_id VARCHAR(255),
  meta_ig_account_id VARCHAR(255),
  meta_connected_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'worker' CHECK (role IN ('super_admin', 'admin', 'worker')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  address TEXT NOT NULL,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  description TEXT NOT NULL,
  social_description TEXT,
  photo_paths TEXT[],
  collage_path TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  gbp_post_id VARCHAR(255),
  gbp_status VARCHAR(20) DEFAULT 'pending' CHECK (gbp_status IN ('pending', 'posted', 'failed', 'skipped')),
  gbp_error TEXT,
  fb_post_id VARCHAR(255),
  fb_status VARCHAR(20) DEFAULT 'pending' CHECK (fb_status IN ('pending', 'posted', 'failed', 'skipped')),
  fb_error TEXT,
  ig_post_id VARCHAR(255),
  ig_status VARCHAR(20) DEFAULT 'pending' CHECK (ig_status IN ('pending', 'posted', 'failed', 'skipped')),
  ig_error TEXT
);

CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255),
  token VARCHAR(255) UNIQUE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days'
);
