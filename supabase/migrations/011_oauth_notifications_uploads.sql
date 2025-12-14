-- Migration 011: OAuth, Notifications, and File Upload Integration
-- Date: December 11, 2025
-- Description: Adds tables for OAuth connections, notification preferences, notification logs, and file uploads

-- OAuth Connections Table
CREATE TABLE IF NOT EXISTS oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  provider_user_id VARCHAR(255),
  provider_data JSONB,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_authenticated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_oauth_user_provider ON oauth_connections(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_connections(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_last_auth ON oauth_connections(last_authenticated);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  webhook_enabled BOOLEAN DEFAULT false,
  webhook_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_pref_shop ON notification_preferences(shop_id);
CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON notification_preferences(user_id);

-- Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient VARCHAR(255) NOT NULL,
  subject TEXT,
  message TEXT,
  channels TEXT[],
  results JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_shop ON notification_logs(shop_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notification_logs(user_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notification_logs(recipient);

-- File Uploads Table
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  url TEXT NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_shop ON file_uploads(shop_id, uploaded_at);
CREATE INDEX IF NOT EXISTS idx_file_uploads_user ON file_uploads(user_id, uploaded_at);
CREATE INDEX IF NOT EXISTS idx_file_uploads_mime ON file_uploads(mime_type);

-- Enable RLS on all new tables
ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for oauth_connections
DO $$ BEGIN
  CREATE POLICY oauth_connections_select_own ON oauth_connections
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY oauth_connections_insert_own ON oauth_connections
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY oauth_connections_delete_own ON oauth_connections
    FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Create RLS policies for notification_preferences
DO $$ BEGIN
  CREATE POLICY notification_pref_select_own ON notification_preferences
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY notification_pref_update_own ON notification_preferences
    FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Create RLS policies for notification_logs
DO $$ BEGIN
  CREATE POLICY notification_logs_select_own ON notification_logs
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Create RLS policies for file_uploads
DO $$ BEGIN
  CREATE POLICY file_uploads_select_own ON file_uploads
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY file_uploads_insert_own ON file_uploads
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY file_uploads_delete_own ON file_uploads
    FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Grant permissions
GRANT SELECT ON oauth_connections TO authenticated;
GRANT INSERT ON oauth_connections TO authenticated;
GRANT DELETE ON oauth_connections TO authenticated;

GRANT SELECT ON notification_preferences TO authenticated;
GRANT INSERT ON notification_preferences TO authenticated;
GRANT UPDATE ON notification_preferences TO authenticated;

GRANT SELECT ON notification_logs TO authenticated;

GRANT SELECT ON file_uploads TO authenticated;
GRANT INSERT ON file_uploads TO authenticated;
GRANT DELETE ON file_uploads TO authenticated;
