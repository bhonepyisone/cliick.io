-- ============================================
-- Supabase Database Schema for Cliick.io
-- Complete schema for inventory, analytics, backup & sync
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

-- User profiles (extends users table)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    username TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT profiles_email_unique UNIQUE (email)
);

-- ============================================
-- SHOPS & TEAMS
-- ============================================

CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'expired', 'pending_approval');
CREATE TYPE data_extension_status AS ENUM ('inactive', 'pending_activation', 'active', 'pending_deletion', 'deletion_applied', 'pending_cancellation', 'pending_approval');
CREATE TYPE team_role AS ENUM ('Owner', 'Admin', 'Order Manager', 'Support Agent');

CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    logo_url TEXT,
    description TEXT,
    
    -- Subscription
    subscription_plan TEXT NOT NULL DEFAULT 'Starter',
    subscription_status subscription_status DEFAULT 'trialing',
    trial_ends_at TIMESTAMPTZ,
    period_ends_at TIMESTAMPTZ,
    payment_proof TEXT,
    
    -- Data history extension
    data_extension_status data_extension_status DEFAULT 'inactive',
    data_extension_subscribed_at TIMESTAMPTZ,
    data_extension_deletion_scheduled_at TIMESTAMPTZ,
    data_extension_is_committed BOOLEAN DEFAULT FALSE,
    
    -- AI Credits
    ai_credits_description_generator INT DEFAULT 5,
    ai_credits_photo_studio INT DEFAULT 3,
    ai_credits_shop_suggestion INT DEFAULT 10,
    
    -- Settings
    assistant_name TEXT DEFAULT 'Shop Assistant',
    assistant_tone TEXT DEFAULT 'Friendly',
    primary_language TEXT DEFAULT 'en',
    offline_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role team_role NOT NULL DEFAULT 'Support Agent',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, user_id)
);

-- ============================================
-- PRODUCTS & INVENTORY
-- ============================================

CREATE TYPE item_type AS ENUM ('product', 'service');

CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    item_type item_type NOT NULL DEFAULT 'product',
    name TEXT NOT NULL,
    description TEXT,
    facebook_subtitle TEXT,
    
    -- Pricing
    retail_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    original_price NUMERIC(10, 2), -- buying/cost price
    promo_price NUMERIC(10, 2),
    promo_start_date TIMESTAMPTZ,
    promo_end_date TIMESTAMPTZ,
    
    -- Inventory
    stock INT NOT NULL DEFAULT 0,
    category TEXT,
    
    -- Media & Details
    image_url TEXT,
    warranty TEXT,
    
    -- Service-specific
    duration INT, -- in minutes
    location TEXT,
    
    -- Form linkage
    form_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock movement history
CREATE TABLE IF NOT EXISTS stock_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    
    change INT NOT NULL, -- can be positive or negative
    new_stock INT NOT NULL,
    reason TEXT NOT NULL,
    
    -- Audit trail
    changed_by UUID REFERENCES profiles(id),
    
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_history_item ON stock_history(item_id);
CREATE INDEX idx_stock_history_timestamp ON stock_history(timestamp DESC);

-- ============================================
-- FORMS & SUBMISSIONS
-- ============================================

CREATE TYPE form_field_type AS ENUM (
    'Short Text', 'Text Area', 'Number', 'Email', 'Phone', 
    'Date', 'Dropdown', 'Multiple Choice', 'Checkbox', 
    'Item Selector', 'Payment Selector'
);

CREATE TABLE IF NOT EXISTS forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    fields JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of FormField objects
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE order_status AS ENUM ('Pending', 'Confirmed', 'Completed', 'Cancelled', 'Return');

CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id TEXT NOT NULL UNIQUE, -- User-facing ID like "ORD-1234"
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE SET NULL,
    form_name TEXT NOT NULL,
    
    -- Order details
    status order_status NOT NULL DEFAULT 'Pending',
    ordered_products JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of OrderedItem
    payment_method TEXT,
    payment_screenshot_url TEXT,
    
    -- Discount
    discount JSONB, -- {type, value, amount}
    
    -- Custom form data
    custom_fields JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamps
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_shop ON form_submissions(shop_id);
CREATE INDEX idx_submissions_status ON form_submissions(status);
CREATE INDEX idx_submissions_date ON form_submissions(submitted_at DESC);

-- ============================================
-- PAYMENT METHODS
-- ============================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    instructions TEXT NOT NULL,
    qr_code_url TEXT,
    requires_proof BOOLEAN DEFAULT FALSE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATIONS & MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL, -- External ID (Facebook ID, phone, etc.)
    customer_name TEXT,
    platform TEXT NOT NULL, -- 'web', 'facebook', 'telegram', etc.
    
    -- Status
    is_live BOOLEAN DEFAULT TRUE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE message_sender AS ENUM ('user', 'bot');

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender message_sender NOT NULL,
    text TEXT,
    attachment JSONB, -- {type, url, name}
    quick_replies JSONB, -- Array of quick reply actions
    carousel JSONB, -- Array of carousel items
    persistent_buttons JSONB, -- Array of persistent menu items
    
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);

-- ============================================
-- AUTOMATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS keyword_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    keywords TEXT NOT NULL,
    reply TEXT NOT NULL,
    match_type TEXT NOT NULL DEFAULT 'contains', -- 'contains' | 'exact'
    apply_to_chat BOOLEAN DEFAULT TRUE,
    apply_to_comments BOOLEAN DEFAULT FALSE,
    attachment JSONB,
    buttons JSONB DEFAULT '[]'::JSONB,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS & METRICS
-- ============================================

-- Daily aggregated sales metrics
CREATE TABLE IF NOT EXISTS daily_sales_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Sales
    revenue NUMERIC(12, 2) DEFAULT 0,
    net_profit NUMERIC(12, 2) DEFAULT 0,
    orders_count INT DEFAULT 0,
    items_sold INT DEFAULT 0,
    avg_order_value NUMERIC(10, 2) DEFAULT 0,
    
    -- Status breakdown
    pending_count INT DEFAULT 0,
    confirmed_count INT DEFAULT 0,
    completed_count INT DEFAULT 0,
    cancelled_count INT DEFAULT 0,
    return_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, date)
);

CREATE INDEX idx_daily_metrics_shop_date ON daily_sales_metrics(shop_id, date DESC);

-- Product performance analytics
CREATE TABLE IF NOT EXISTS product_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    units_sold INT DEFAULT 0,
    units_returned INT DEFAULT 0,
    revenue NUMERIC(10, 2) DEFAULT 0,
    cost_of_goods NUMERIC(10, 2) DEFAULT 0,
    profit NUMERIC(10, 2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, item_id, date)
);

CREATE INDEX idx_product_analytics_shop ON product_analytics(shop_id, date DESC);
CREATE INDEX idx_product_analytics_item ON product_analytics(item_id, date DESC);

-- Platform-wide admin metrics
CREATE TABLE IF NOT EXISTS platform_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    
    -- Revenue
    mrr NUMERIC(12, 2) DEFAULT 0, -- Monthly Recurring Revenue
    platform_gmv NUMERIC(12, 2) DEFAULT 0, -- Gross Merchandise Value
    
    -- Users & Shops
    new_users INT DEFAULT 0,
    new_subscriptions INT DEFAULT 0,
    active_shops INT DEFAULT 0,
    total_shops INT DEFAULT 0,
    
    -- Engagement
    total_orders INT DEFAULT 0,
    total_conversations INT DEFAULT 0,
    ai_messages_processed INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_metrics_date ON platform_metrics(date DESC);

-- ============================================
-- BACKUP & DISASTER RECOVERY
-- ============================================

CREATE TABLE IF NOT EXISTS backup_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_type TEXT NOT NULL, -- 'full', 'incremental', 'manual'
    status TEXT NOT NULL, -- 'in_progress', 'completed', 'failed'
    
    -- Storage info
    storage_location TEXT, -- S3/Supabase Storage path
    file_size_bytes BIGINT,
    
    -- Metadata
    tables_included TEXT[], -- Array of table names
    rows_backed_up INT,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Error info
    error_message TEXT
);

CREATE INDEX idx_backup_logs_date ON backup_logs(started_at DESC);

-- Point-in-time recovery snapshots
CREATE TABLE IF NOT EXISTS recovery_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_name TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- What's included
    shop_ids UUID[], -- NULL means all shops
    backup_log_id UUID REFERENCES backup_logs(id),
    
    -- Restore info
    can_restore_to_timestamp TIMESTAMPTZ NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ -- Auto-delete after this
);

-- Data sync status (for multi-region/offline sync)
CREATE TABLE IF NOT EXISTS sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    
    last_synced_at TIMESTAMPTZ,
    sync_version BIGINT DEFAULT 0,
    
    -- Conflict resolution
    has_conflicts BOOLEAN DEFAULT FALSE,
    conflict_details JSONB,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, table_name)
);

-- ============================================
-- INTEGRATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS social_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- 'facebook', 'instagram', 'tiktok', 'telegram', 'viber'
    
    -- OAuth tokens (encrypted)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- Platform-specific IDs
    platform_user_id TEXT,
    platform_page_id TEXT,
    
    -- Status
    is_connected BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, platform)
);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON form_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_integrations ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Shops: Users can access shops they're a member of
CREATE POLICY "Users can view shops they're members of" ON shops FOR SELECT 
    USING (
        owner_id = auth.uid() OR 
        id IN (SELECT shop_id FROM team_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Owners can update their shops" ON shops FOR UPDATE 
    USING (owner_id = auth.uid());

-- Team members: Can view their own memberships
CREATE POLICY "Users can view their team memberships" ON team_members FOR SELECT 
    USING (user_id = auth.uid());

-- Items: Shop members can view, owners/admins can modify
CREATE POLICY "Shop members can view items" ON items FOR SELECT 
    USING (
        shop_id IN (
            SELECT shop_id FROM team_members WHERE user_id = auth.uid()
            UNION
            SELECT id FROM shops WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Shop owners/admins can modify items" ON items FOR ALL 
    USING (
        shop_id IN (
            SELECT shop_id FROM team_members 
            WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin')
            UNION
            SELECT id FROM shops WHERE owner_id = auth.uid()
        )
    );

-- Form submissions: Shop members can view/modify
CREATE POLICY "Shop members can access submissions" ON form_submissions FOR ALL 
    USING (
        shop_id IN (
            SELECT shop_id FROM team_members WHERE user_id = auth.uid()
            UNION
            SELECT id FROM shops WHERE owner_id = auth.uid()
        )
    );

-- Analytics: Shop members can view
CREATE POLICY "Shop members can view analytics" ON daily_sales_metrics FOR SELECT 
    USING (
        shop_id IN (
            SELECT shop_id FROM team_members WHERE user_id = auth.uid()
            UNION
            SELECT id FROM shops WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Shop members can view product analytics" ON product_analytics FOR SELECT 
    USING (
        shop_id IN (
            SELECT shop_id FROM team_members WHERE user_id = auth.uid()
            UNION
            SELECT id FROM shops WHERE owner_id = auth.uid()
        )
    );

-- Platform metrics: Only accessible via service role (admin dashboard)
CREATE POLICY "Service role can access platform metrics" ON platform_metrics FOR ALL 
    USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_shops_owner ON shops(owner_id);
CREATE INDEX idx_items_shop ON items(shop_id);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_forms_shop ON forms(shop_id);
CREATE INDEX idx_conversations_shop ON conversations(shop_id);
CREATE INDEX idx_conversations_live ON conversations(shop_id, is_live);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_shop ON team_members(shop_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE shops IS 'Multi-tenant shops table with subscription and AI credits';
COMMENT ON TABLE items IS 'Products and services with inventory tracking';
COMMENT ON TABLE stock_history IS 'Complete audit trail of all stock movements';
COMMENT ON TABLE form_submissions IS 'Customer orders and form submissions';
COMMENT ON TABLE daily_sales_metrics IS 'Pre-aggregated daily sales data for fast analytics';
COMMENT ON TABLE product_analytics IS 'Product-level performance metrics';
COMMENT ON TABLE backup_logs IS 'Automated backup execution history';
COMMENT ON TABLE recovery_snapshots IS 'Point-in-time recovery snapshots for disaster recovery';
COMMENT ON TABLE sync_status IS 'Multi-region sync status tracking';
