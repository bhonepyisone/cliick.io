-- Token Usage Tracking Tables
-- Stores Gemini API token consumption logs and shop budgets

-- =====================================================
-- 1. Token Usage Logs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS token_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- References
    shop_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    conversation_id TEXT,
    
    -- Operation Details
    operation_type TEXT NOT NULL CHECK (operation_type IN ('chat_message', 'product_description', 'photo_studio', 'suggestion')),
    model_name TEXT NOT NULL,
    
    -- Token Counts
    input_tokens INTEGER NOT NULL CHECK (input_tokens >= 0),
    output_tokens INTEGER NOT NULL CHECK (output_tokens >= 0),
    total_tokens INTEGER NOT NULL CHECK (total_tokens >= 0),
    
    -- Costs (in USD)
    input_cost DECIMAL(10, 8) NOT NULL CHECK (input_cost >= 0),
    output_cost DECIMAL(10, 8) NOT NULL CHECK (output_cost >= 0),
    total_cost DECIMAL(10, 8) NOT NULL CHECK (total_cost >= 0),
    
    -- Metadata (JSONB for flexibility)
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_token_logs_shop_id ON token_usage_logs(shop_id);
CREATE INDEX idx_token_logs_created_at ON token_usage_logs(created_at DESC);
CREATE INDEX idx_token_logs_operation_type ON token_usage_logs(operation_type);
CREATE INDEX idx_token_logs_shop_created ON token_usage_logs(shop_id, created_at DESC);

-- Row Level Security
ALTER TABLE token_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs for their shops
CREATE POLICY "Users can view their shop token logs"
    ON token_usage_logs FOR SELECT
    USING (
        shop_id IN (
            SELECT s.id FROM shops s
            INNER JOIN team_members tm ON s.id = tm.shop_id
            WHERE tm.user_id = auth.uid()
        )
    );

-- Policy: System can insert logs (service role)
CREATE POLICY "Service role can insert token logs"
    ON token_usage_logs FOR INSERT
    WITH CHECK (true);

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view all token logs"
    ON token_usage_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- 2. Shop Token Budgets Table
-- =====================================================
CREATE TABLE IF NOT EXISTS shop_token_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Budget Limits (in USD)
    daily_budget DECIMAL(10, 2) DEFAULT 5.00 CHECK (daily_budget >= 0),
    monthly_budget DECIMAL(10, 2) DEFAULT 100.00 CHECK (monthly_budget >= 0),
    
    -- Current Spending (reset automatically)
    daily_spent DECIMAL(10, 8) DEFAULT 0 CHECK (daily_spent >= 0),
    monthly_spent DECIMAL(10, 8) DEFAULT 0 CHECK (monthly_spent >= 0),
    
    -- Reset Dates
    daily_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
    monthly_reset_date DATE NOT NULL DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
    
    -- Alerts
    alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold BETWEEN 0 AND 100),
    daily_alert_sent BOOLEAN DEFAULT FALSE,
    monthly_alert_sent BOOLEAN DEFAULT FALSE,
    
    -- Auto-optimization
    auto_optimization_enabled BOOLEAN DEFAULT FALSE,
    fallback_model TEXT DEFAULT 'gemini-2.5-flash',
    
    -- Budget Status
    is_budget_exceeded BOOLEAN DEFAULT FALSE,
    last_exceeded_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_shop_budgets_shop_id ON shop_token_budgets(shop_id);
CREATE INDEX idx_shop_budgets_daily_reset ON shop_token_budgets(daily_reset_date);
CREATE INDEX idx_shop_budgets_monthly_reset ON shop_token_budgets(monthly_reset_date);

-- Row Level Security
ALTER TABLE shop_token_budgets ENABLE ROW LEVEL SECURITY;

-- Policy: Shop owners can view and update their budget
CREATE POLICY "Shop owners can manage their token budget"
    ON shop_token_budgets FOR ALL
    USING (
        shop_id IN (
            SELECT s.id FROM shops s
            INNER JOIN team_members tm ON s.id = tm.shop_id
            WHERE tm.user_id = auth.uid() AND tm.role = 'owner'
        )
    );

-- Policy: Admins can manage all budgets
CREATE POLICY "Admins can manage all token budgets"
    ON shop_token_budgets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- 3. Functions for Automatic Budget Management
-- =====================================================

-- Function: Reset daily budgets
CREATE OR REPLACE FUNCTION reset_daily_token_budgets()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE shop_token_budgets
    SET 
        daily_spent = 0,
        daily_alert_sent = FALSE,
        daily_reset_date = CURRENT_DATE,
        is_budget_exceeded = CASE 
            WHEN monthly_spent >= monthly_budget THEN TRUE 
            ELSE FALSE 
        END
    WHERE daily_reset_date < CURRENT_DATE;
END;
$$;

-- Function: Reset monthly budgets
CREATE OR REPLACE FUNCTION reset_monthly_token_budgets()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE shop_token_budgets
    SET 
        monthly_spent = 0,
        monthly_alert_sent = FALSE,
        monthly_reset_date = DATE_TRUNC('month', CURRENT_DATE)::DATE,
        is_budget_exceeded = FALSE
    WHERE monthly_reset_date < DATE_TRUNC('month', CURRENT_DATE)::DATE;
END;
$$;

-- Function: Update shop spending after token log insert
CREATE OR REPLACE FUNCTION update_shop_token_spending()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_budget RECORD;
    v_daily_percent DECIMAL;
    v_monthly_percent DECIMAL;
BEGIN
    -- Get or create budget record for shop
    INSERT INTO shop_token_budgets (shop_id)
    VALUES (NEW.shop_id)
    ON CONFLICT (shop_id) DO NOTHING;
    
    -- Update spending
    UPDATE shop_token_budgets
    SET 
        daily_spent = daily_spent + NEW.total_cost,
        monthly_spent = monthly_spent + NEW.total_cost,
        updated_at = NOW()
    WHERE shop_id = NEW.shop_id
    RETURNING * INTO v_budget;
    
    -- Check if budget exceeded
    IF v_budget.daily_spent >= v_budget.daily_budget OR v_budget.monthly_spent >= v_budget.monthly_budget THEN
        UPDATE shop_token_budgets
        SET 
            is_budget_exceeded = TRUE,
            last_exceeded_at = NOW()
        WHERE shop_id = NEW.shop_id;
    END IF;
    
    -- Check alert thresholds
    v_daily_percent := (v_budget.daily_spent / NULLIF(v_budget.daily_budget, 0)) * 100;
    v_monthly_percent := (v_budget.monthly_spent / NULLIF(v_budget.monthly_budget, 0)) * 100;
    
    IF v_daily_percent >= v_budget.alert_threshold AND NOT v_budget.daily_alert_sent THEN
        UPDATE shop_token_budgets
        SET daily_alert_sent = TRUE
        WHERE shop_id = NEW.shop_id;
        
        -- Note: Alert notification would be handled by application layer
    END IF;
    
    IF v_monthly_percent >= v_budget.alert_threshold AND NOT v_budget.monthly_alert_sent THEN
        UPDATE shop_token_budgets
        SET monthly_alert_sent = TRUE
        WHERE shop_id = NEW.shop_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger: Update spending after log insert
CREATE TRIGGER trigger_update_shop_token_spending
    AFTER INSERT ON token_usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_shop_token_spending();

-- =====================================================
-- 4. Views for Analytics
-- =====================================================

-- View: Daily token usage summary per shop
CREATE OR REPLACE VIEW daily_token_usage AS
SELECT 
    shop_id,
    DATE(created_at) as usage_date,
    operation_type,
    COUNT(*) as request_count,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    SUM(total_tokens) as total_tokens,
    SUM(total_cost) as total_cost,
    AVG(input_tokens) as avg_input_tokens,
    AVG(output_tokens) as avg_output_tokens,
    AVG(total_cost) as avg_cost_per_request
FROM token_usage_logs
GROUP BY shop_id, DATE(created_at), operation_type;

-- View: Monthly token usage summary per shop
CREATE OR REPLACE VIEW monthly_token_usage AS
SELECT 
    shop_id,
    DATE_TRUNC('month', created_at) as usage_month,
    operation_type,
    COUNT(*) as request_count,
    SUM(total_tokens) as total_tokens,
    SUM(total_cost) as total_cost,
    AVG(total_cost) as avg_cost_per_request
FROM token_usage_logs
GROUP BY shop_id, DATE_TRUNC('month', created_at), operation_type;

-- View: Shop budget status
CREATE OR REPLACE VIEW shop_budget_status AS
SELECT 
    stb.shop_id,
    stb.daily_budget,
    stb.daily_spent,
    ROUND((stb.daily_spent / NULLIF(stb.daily_budget, 0) * 100)::numeric, 2) as daily_percent_used,
    stb.monthly_budget,
    stb.monthly_spent,
    ROUND((stb.monthly_spent / NULLIF(stb.monthly_budget, 0) * 100)::numeric, 2) as monthly_percent_used,
    stb.is_budget_exceeded,
    stb.auto_optimization_enabled,
    stb.daily_reset_date,
    stb.monthly_reset_date
FROM shop_token_budgets stb;

-- =====================================================
-- 5. Scheduled Tasks (Run via pg_cron or external scheduler)
-- =====================================================

-- Daily budget reset (run at midnight UTC)
-- SELECT reset_daily_token_budgets();

-- Monthly budget reset (run at start of month)
-- SELECT reset_monthly_token_budgets();

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE token_usage_logs IS 'Stores detailed logs of all Gemini API token usage';
COMMENT ON TABLE shop_token_budgets IS 'Manages token usage budgets and spending limits per shop';
COMMENT ON FUNCTION reset_daily_token_budgets() IS 'Resets daily spending counters for all shops';
COMMENT ON FUNCTION reset_monthly_token_budgets() IS 'Resets monthly spending counters for all shops';
COMMENT ON FUNCTION update_shop_token_spending() IS 'Automatically updates shop spending when new token logs are inserted';
