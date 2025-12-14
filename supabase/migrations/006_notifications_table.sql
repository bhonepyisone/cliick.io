-- ============================================
-- Migration: Create Notifications Table
-- ============================================
-- Creates persistent storage for user notifications
-- Previously stored only in localStorage
--
-- Created: December 10, 2025
-- Issue: Notifications lost on new browser/device

-- ============================================
-- 1. CREATE NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- info, success, warning, error
    is_read BOOLEAN DEFAULT false,
    action_url TEXT, -- Optional URL to navigate to
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_id_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES
-- ============================================

-- Allow users to read their own notifications
CREATE POLICY "Users can read own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- Allow service role to insert notifications
CREATE POLICY "Service role can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 5. CREATE FUNCTION TO MARK NOTIFICATION AS READ
-- ============================================

CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS notification
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE notifications
    SET is_read = true, updated_at = NOW()
    WHERE id = notification_id AND user_id = auth.uid();
    
    RETURN (SELECT * FROM notifications WHERE id = notification_id);
END;
$$;

-- ============================================
-- 6. CREATE FUNCTION TO DELETE OLD NOTIFICATIONS
-- ============================================

CREATE OR REPLACE FUNCTION delete_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete read notifications older than 30 days
    DELETE FROM notifications
    WHERE is_read = true AND created_at < NOW() - INTERVAL '30 days';
    
    -- Delete all notifications older than 90 days
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON TABLE notifications IS 'User notifications with persistent storage';
COMMENT ON COLUMN notifications.id IS 'Unique notification identifier';
COMMENT ON COLUMN notifications.user_id IS 'User who receives this notification';
COMMENT ON COLUMN notifications.title IS 'Notification title/subject';
COMMENT ON COLUMN notifications.message IS 'Notification message content';
COMMENT ON COLUMN notifications.type IS 'Notification type: info, success, warning, error';
COMMENT ON COLUMN notifications.is_read IS 'Whether user has read this notification';
COMMENT ON COLUMN notifications.action_url IS 'Optional URL to navigate to when clicked';
COMMENT ON COLUMN notifications.created_at IS 'When notification was created';
COMMENT ON COLUMN notifications.updated_at IS 'When notification was last updated';

-- ============================================
-- 8. VERIFICATION QUERIES
-- ============================================

-- Check table created
-- SELECT * FROM information_schema.tables WHERE table_name = 'notifications';

-- Check indexes
-- SELECT indexname FROM pg_indexes WHERE tablename = 'notifications';

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'notifications';

-- Insert test notification
-- INSERT INTO notifications (user_id, title, message, type)
-- SELECT id, 'Test', 'Test notification', 'info'
-- FROM profiles LIMIT 1;
