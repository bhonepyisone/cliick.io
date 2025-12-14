-- ============================================
-- Migration: Create Analytics/Events Table
-- ============================================
-- Tracks user activities and application metrics
-- Enables analytics dashboard and user behavior analysis
--
-- Created: December 10, 2025

-- ============================================
-- 1. CREATE EVENTS TABLE
-- ============================================

CREATE TABLE user_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- 'message_sent', 'order_created', 'product_viewed', 'form_submitted', etc.
    event_name TEXT, -- Descriptive name for the event
    category TEXT, -- 'chat', 'orders', 'products', 'forms', 'integrations', etc.
    metadata JSONB DEFAULT '{}', -- Additional event-specific data
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE DAILY METRICS TABLE
-- ============================================

CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    messages_count INTEGER DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    forms_submitted INTEGER DEFAULT 0,
    products_viewed INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, metric_date)
);

-- ============================================
-- 3. CREATE HOURLY METRICS TABLE
-- ============================================

CREATE TABLE hourly_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    metric_hour TIMESTAMPTZ NOT NULL,
    messages_count INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, metric_hour)
);

-- ============================================
-- 4. CREATE INDEXES
-- ============================================

CREATE INDEX idx_user_events_user_id ON user_events(user_id);
CREATE INDEX idx_user_events_shop_id ON user_events(shop_id);
CREATE INDEX idx_user_events_event_type ON user_events(event_type);
CREATE INDEX idx_user_events_created_at ON user_events(created_at DESC);
CREATE INDEX idx_user_events_shop_user_created ON user_events(shop_id, user_id, created_at DESC);

CREATE INDEX idx_daily_metrics_shop_id ON daily_metrics(shop_id);
CREATE INDEX idx_daily_metrics_date ON daily_metrics(metric_date DESC);
CREATE INDEX idx_daily_metrics_shop_date ON daily_metrics(shop_id, metric_date DESC);

CREATE INDEX idx_hourly_metrics_shop_id ON hourly_metrics(shop_id);
CREATE INDEX idx_hourly_metrics_hour ON hourly_metrics(metric_hour DESC);

-- ============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CREATE RLS POLICIES
-- ============================================

-- User Events: Service role can insert, users can read own shop events
CREATE POLICY "Service role can insert events"
ON user_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can read own shop events"
ON user_events FOR SELECT
USING (
    shop_id IN (
        SELECT shop_id FROM team_members WHERE user_id = auth.uid()
    )
);

-- Daily Metrics: Shop members can read their shop metrics
CREATE POLICY "Shop members can read daily metrics"
ON daily_metrics FOR SELECT
USING (
    shop_id IN (
        SELECT shop_id FROM team_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Service role can upsert daily metrics"
ON daily_metrics FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update daily metrics"
ON daily_metrics FOR UPDATE
USING (true);

-- Hourly Metrics: Shop members can read their shop metrics
CREATE POLICY "Shop members can read hourly metrics"
ON hourly_metrics FOR SELECT
USING (
    shop_id IN (
        SELECT shop_id FROM team_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Service role can upsert hourly metrics"
ON hourly_metrics FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update hourly metrics"
ON hourly_metrics FOR UPDATE
USING (true);

-- ============================================
-- 7. CREATE FUNCTIONS FOR AGGREGATION
-- ============================================

CREATE OR REPLACE FUNCTION aggregate_daily_metrics(target_shop_id UUID, target_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO daily_metrics (shop_id, metric_date, messages_count, orders_count, forms_submitted, products_viewed)
    SELECT
        target_shop_id,
        target_date,
        COUNT(CASE WHEN event_type = 'message_sent' THEN 1 END),
        COUNT(CASE WHEN event_type = 'order_created' THEN 1 END),
        COUNT(CASE WHEN event_type = 'form_submitted' THEN 1 END),
        COUNT(CASE WHEN event_type = 'product_viewed' THEN 1 END)
    FROM user_events
    WHERE shop_id = target_shop_id AND DATE(created_at) = target_date
    ON CONFLICT (shop_id, metric_date) DO UPDATE SET
        messages_count = EXCLUDED.messages_count,
        orders_count = EXCLUDED.orders_count,
        forms_submitted = EXCLUDED.forms_submitted,
        products_viewed = EXCLUDED.products_viewed,
        updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION aggregate_hourly_metrics(target_shop_id UUID, target_hour TIMESTAMPTZ)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO hourly_metrics (shop_id, metric_hour, messages_count, active_users)
    SELECT
        target_shop_id,
        target_hour,
        COUNT(CASE WHEN event_type = 'message_sent' THEN 1 END),
        COUNT(DISTINCT user_id)
    FROM user_events
    WHERE shop_id = target_shop_id 
        AND created_at >= target_hour
        AND created_at < target_hour + INTERVAL '1 hour'
    ON CONFLICT (shop_id, metric_hour) DO UPDATE SET
        messages_count = EXCLUDED.messages_count,
        active_users = EXCLUDED.active_users;
END;
$$;

-- ============================================
-- 8. COMMENTS
-- ============================================

COMMENT ON TABLE user_events IS 'Track user activities and events for analytics';
COMMENT ON COLUMN user_events.event_type IS 'Type of event: message_sent, order_created, product_viewed, form_submitted, etc.';
COMMENT ON COLUMN user_events.metadata IS 'JSON object with event-specific data (product_id, order_id, etc.)';

COMMENT ON TABLE daily_metrics IS 'Daily aggregated metrics per shop';
COMMENT ON TABLE hourly_metrics IS 'Hourly aggregated metrics per shop';

-- ============================================
-- 9. RETENTION POLICY
-- ============================================

-- Delete events older than 90 days (for space optimization)
CREATE OR REPLACE FUNCTION delete_old_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM user_events
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- ============================================
-- 10. VERIFICATION QUERIES
-- ============================================

-- Check tables created
-- SELECT * FROM information_schema.tables 
-- WHERE table_name IN ('user_events', 'daily_metrics', 'hourly_metrics');

-- Check indexes
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename IN ('user_events', 'daily_metrics', 'hourly_metrics');

-- Check RLS policies
-- SELECT * FROM pg_policies 
-- WHERE tablename IN ('user_events', 'daily_metrics', 'hourly_metrics');

-- Insert test event
-- INSERT INTO user_events (user_id, shop_id, event_type, event_name, category)
-- VALUES (uuid_generate_v4(), uuid_generate_v4(), 'test_event', 'Test Event', 'testing');
