-- ============================================
-- Database Functions & Stored Procedures
-- Inventory, Analytics, and Backup Operations
-- ============================================

-- ============================================
-- INVENTORY MANAGEMENT FUNCTIONS
-- ============================================

-- Update stock with automatic history tracking
CREATE OR REPLACE FUNCTION update_stock(
    p_item_id UUID,
    p_change INT,
    p_reason TEXT,
    p_changed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_shop_id UUID;
    v_current_stock INT;
    v_new_stock INT;
    v_result JSONB;
BEGIN
    -- Get current stock and shop_id
    SELECT stock, shop_id INTO v_current_stock, v_shop_id
    FROM items
    WHERE id = p_item_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Item not found'
        );
    END IF;
    
    -- Calculate new stock
    v_new_stock := v_current_stock + p_change;
    
    -- Prevent negative stock
    IF v_new_stock < 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient stock',
            'current_stock', v_current_stock,
            'requested_change', p_change
        );
    END IF;
    
    -- Update item stock
    UPDATE items
    SET stock = v_new_stock,
        updated_at = NOW()
    WHERE id = p_item_id;
    
    -- Record in stock history
    INSERT INTO stock_history (
        item_id,
        shop_id,
        change,
        new_stock,
        reason,
        changed_by,
        timestamp
    ) VALUES (
        p_item_id,
        v_shop_id,
        p_change,
        v_new_stock,
        p_reason,
        p_changed_by,
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'item_id', p_item_id,
        'previous_stock', v_current_stock,
        'change', p_change,
        'new_stock', v_new_stock
    );
END;
$$;

-- Bulk stock update (for order processing)
CREATE OR REPLACE FUNCTION process_order_stock_changes(
    p_order_items JSONB, -- [{item_id, quantity}]
    p_order_id TEXT,
    p_shop_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_result JSONB;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INT := 0;
BEGIN
    -- Loop through each item in the order
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
    LOOP
        -- Attempt to update stock
        v_result := update_stock(
            (v_item->>'item_id')::UUID,
            -((v_item->>'quantity')::INT), -- Negative because it's a sale
            'Order: ' || p_order_id,
            NULL
        );
        
        IF (v_result->>'success')::BOOLEAN THEN
            v_success_count := v_success_count + 1;
        ELSE
            v_errors := v_errors || jsonb_build_object(
                'item_id', v_item->>'item_id',
                'error', v_result->>'error'
            );
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', jsonb_array_length(v_errors) = 0,
        'processed', v_success_count,
        'errors', v_errors
    );
END;
$$;

-- Get low stock items
CREATE OR REPLACE FUNCTION get_low_stock_items(
    p_shop_id UUID,
    p_threshold INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    stock INT,
    category TEXT,
    last_sale_date TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.name,
        i.stock,
        i.category,
        (
            SELECT MAX(fs.submitted_at)
            FROM form_submissions fs,
            jsonb_array_elements(fs.ordered_products) AS op
            WHERE fs.shop_id = p_shop_id
            AND (op->>'productId')::TEXT = i.id::TEXT
        ) AS last_sale_date
    FROM items i
    WHERE i.shop_id = p_shop_id
    AND i.item_type = 'product'
    AND i.stock > 0
    AND i.stock <= p_threshold
    ORDER BY i.stock ASC, last_sale_date DESC NULLS LAST;
END;
$$;

-- ============================================
-- ANALYTICS FUNCTIONS
-- ============================================

-- Generate daily sales metrics
CREATE OR REPLACE FUNCTION generate_daily_sales_metrics(
    p_shop_id UUID,
    p_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_revenue NUMERIC := 0;
    v_net_profit NUMERIC := 0;
    v_orders_count INT := 0;
    v_items_sold INT := 0;
    v_avg_order_value NUMERIC := 0;
    v_pending INT := 0;
    v_confirmed INT := 0;
    v_completed INT := 0;
    v_cancelled INT := 0;
    v_return INT := 0;
BEGIN
    -- Get orders for the day
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN status = 'Pending' THEN 1 END),
        COUNT(CASE WHEN status = 'Confirmed' THEN 1 END),
        COUNT(CASE WHEN status = 'Completed' THEN 1 END),
        COUNT(CASE WHEN status = 'Cancelled' THEN 1 END),
        COUNT(CASE WHEN status = 'Return' THEN 1 END)
    INTO v_orders_count, v_pending, v_confirmed, v_completed, v_cancelled, v_return
    FROM form_submissions
    WHERE shop_id = p_shop_id
    AND DATE(submitted_at) = p_date;
    
    -- Calculate revenue and profit from completed orders
    WITH order_details AS (
        SELECT 
            op->>'productId' AS product_id,
            (op->>'quantity')::INT AS quantity,
            (op->>'unitPrice')::NUMERIC AS unit_price
        FROM form_submissions fs,
        jsonb_array_elements(fs.ordered_products) AS op
        WHERE fs.shop_id = p_shop_id
        AND DATE(fs.submitted_at) = p_date
        AND fs.status = 'Completed'
    ),
    revenue_calc AS (
        SELECT 
            SUM(od.quantity * od.unit_price) AS total_revenue,
            SUM(od.quantity) AS total_items,
            SUM(od.quantity * od.unit_price - (od.quantity * COALESCE(i.original_price, 0))) AS total_profit
        FROM order_details od
        LEFT JOIN items i ON i.id::TEXT = od.product_id
    )
    SELECT 
        COALESCE(total_revenue, 0),
        COALESCE(total_items, 0),
        COALESCE(total_profit, 0)
    INTO v_revenue, v_items_sold, v_net_profit
    FROM revenue_calc;
    
    -- Subtract returns
    WITH return_details AS (
        SELECT 
            op->>'productId' AS product_id,
            (op->>'quantity')::INT AS quantity,
            (op->>'unitPrice')::NUMERIC AS unit_price
        FROM form_submissions fs,
        jsonb_array_elements(fs.ordered_products) AS op
        WHERE fs.shop_id = p_shop_id
        AND DATE(fs.submitted_at) = p_date
        AND fs.status = 'Return'
    ),
    return_calc AS (
        SELECT 
            SUM(rd.quantity * rd.unit_price) AS total_return_revenue,
            SUM(rd.quantity * rd.unit_price - (rd.quantity * COALESCE(i.original_price, 0))) AS total_return_profit
        FROM return_details rd
        LEFT JOIN items i ON i.id::TEXT = rd.product_id
    )
    SELECT 
        v_revenue - COALESCE(total_return_revenue, 0),
        v_net_profit - COALESCE(total_return_profit, 0)
    INTO v_revenue, v_net_profit
    FROM return_calc;
    
    -- Calculate average order value
    IF v_completed > 0 THEN
        v_avg_order_value := v_revenue / v_completed;
    END IF;
    
    -- Insert or update daily metrics
    INSERT INTO daily_sales_metrics (
        shop_id, date, revenue, net_profit, orders_count, items_sold, avg_order_value,
        pending_count, confirmed_count, completed_count, cancelled_count, return_count
    ) VALUES (
        p_shop_id, p_date, v_revenue, v_net_profit, v_orders_count, v_items_sold, v_avg_order_value,
        v_pending, v_confirmed, v_completed, v_cancelled, v_return
    )
    ON CONFLICT (shop_id, date) 
    DO UPDATE SET
        revenue = EXCLUDED.revenue,
        net_profit = EXCLUDED.net_profit,
        orders_count = EXCLUDED.orders_count,
        items_sold = EXCLUDED.items_sold,
        avg_order_value = EXCLUDED.avg_order_value,
        pending_count = EXCLUDED.pending_count,
        confirmed_count = EXCLUDED.confirmed_count,
        completed_count = EXCLUDED.completed_count,
        cancelled_count = EXCLUDED.cancelled_count,
        return_count = EXCLUDED.return_count;
END;
$$;

-- Generate product analytics
CREATE OR REPLACE FUNCTION generate_product_analytics(
    p_shop_id UUID,
    p_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Aggregate sales by product
    INSERT INTO product_analytics (shop_id, item_id, date, units_sold, units_returned, revenue, cost_of_goods, profit)
    SELECT 
        p_shop_id,
        i.id,
        p_date,
        COALESCE(sales.units, 0) AS units_sold,
        COALESCE(returns.units, 0) AS units_returned,
        COALESCE(sales.revenue, 0) - COALESCE(returns.revenue, 0) AS revenue,
        (COALESCE(sales.units, 0) - COALESCE(returns.units, 0)) * COALESCE(i.original_price, 0) AS cost_of_goods,
        (COALESCE(sales.revenue, 0) - COALESCE(returns.revenue, 0)) - 
        ((COALESCE(sales.units, 0) - COALESCE(returns.units, 0)) * COALESCE(i.original_price, 0)) AS profit
    FROM items i
    LEFT JOIN (
        SELECT 
            (op->>'productId')::UUID AS product_id,
            SUM((op->>'quantity')::INT) AS units,
            SUM((op->>'quantity')::INT * (op->>'unitPrice')::NUMERIC) AS revenue
        FROM form_submissions fs,
        jsonb_array_elements(fs.ordered_products) AS op
        WHERE fs.shop_id = p_shop_id
        AND DATE(fs.submitted_at) = p_date
        AND fs.status = 'Completed'
        GROUP BY (op->>'productId')::UUID
    ) sales ON sales.product_id = i.id
    LEFT JOIN (
        SELECT 
            (op->>'productId')::UUID AS product_id,
            SUM((op->>'quantity')::INT) AS units,
            SUM((op->>'quantity')::INT * (op->>'unitPrice')::NUMERIC) AS revenue
        FROM form_submissions fs,
        jsonb_array_elements(fs.ordered_products) AS op
        WHERE fs.shop_id = p_shop_id
        AND DATE(fs.submitted_at) = p_date
        AND fs.status = 'Return'
        GROUP BY (op->>'productId')::UUID
    ) returns ON returns.product_id = i.id
    WHERE i.shop_id = p_shop_id
    AND (sales.units IS NOT NULL OR returns.units IS NOT NULL)
    ON CONFLICT (shop_id, item_id, date)
    DO UPDATE SET
        units_sold = EXCLUDED.units_sold,
        units_returned = EXCLUDED.units_returned,
        revenue = EXCLUDED.revenue,
        cost_of_goods = EXCLUDED.cost_of_goods,
        profit = EXCLUDED.profit;
END;
$$;

-- Get sales metrics for date range
CREATE OR REPLACE FUNCTION get_sales_metrics(
    p_shop_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    date DATE,
    revenue NUMERIC,
    net_profit NUMERIC,
    orders_count INT,
    items_sold INT,
    avg_order_value NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dsm.date,
        dsm.revenue,
        dsm.net_profit,
        dsm.orders_count,
        dsm.items_sold,
        dsm.avg_order_value
    FROM daily_sales_metrics dsm
    WHERE dsm.shop_id = p_shop_id
    AND dsm.date BETWEEN p_start_date AND p_end_date
    ORDER BY dsm.date ASC;
END;
$$;

-- ============================================
-- ADMIN/PLATFORM METRICS FUNCTIONS
-- ============================================

-- Generate platform-wide daily metrics
CREATE OR REPLACE FUNCTION generate_platform_metrics(
    p_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mrr NUMERIC := 0;
    v_gmv NUMERIC := 0;
    v_new_users INT := 0;
    v_new_subs INT := 0;
    v_active_shops INT := 0;
    v_total_shops INT := 0;
    v_total_orders INT := 0;
    v_total_conversations INT := 0;
    v_ai_messages INT := 0;
BEGIN
    -- Calculate MRR (from active subscriptions)
    SELECT SUM(
        CASE subscription_plan
            WHEN 'Starter' THEN 0
            WHEN 'Pro' THEN 10000  -- Example pricing
            WHEN 'Growth' THEN 25000
            ELSE 0
        END
    ) INTO v_mrr
    FROM shops
    WHERE subscription_status = 'active';
    
    -- Calculate platform GMV
    SELECT COALESCE(SUM(
        (op->>'quantity')::INT * (op->>'unitPrice')::NUMERIC
    ), 0) INTO v_gmv
    FROM form_submissions fs,
    jsonb_array_elements(fs.ordered_products) AS op
    WHERE DATE(fs.submitted_at) = p_date
    AND fs.status NOT IN ('Cancelled');
    
    -- New users
    SELECT COUNT(*) INTO v_new_users
    FROM profiles
    WHERE DATE(created_at) = p_date;
    
    -- New subscriptions
    SELECT COUNT(*) INTO v_new_subs
    FROM shops
    WHERE DATE(created_at) = p_date;
    
    -- Active shops (had activity in last 30 days)
    SELECT COUNT(DISTINCT shop_id) INTO v_active_shops
    FROM form_submissions
    WHERE submitted_at >= (p_date - INTERVAL '30 days');
    
    -- Total shops
    SELECT COUNT(*) INTO v_total_shops FROM shops;
    
    -- Total orders for the day
    SELECT COUNT(*) INTO v_total_orders
    FROM form_submissions
    WHERE DATE(submitted_at) = p_date;
    
    -- Total conversations
    SELECT COUNT(*) INTO v_total_conversations
    FROM conversations
    WHERE DATE(created_at) = p_date;
    
    -- AI messages (approximate - count bot messages)
    SELECT COUNT(*) INTO v_ai_messages
    FROM messages
    WHERE DATE(timestamp) = p_date
    AND sender = 'bot';
    
    -- Insert or update platform metrics
    INSERT INTO platform_metrics (
        date, mrr, platform_gmv, new_users, new_subscriptions,
        active_shops, total_shops, total_orders, total_conversations, ai_messages_processed
    ) VALUES (
        p_date, v_mrr, v_gmv, v_new_users, v_new_subs,
        v_active_shops, v_total_shops, v_total_orders, v_total_conversations, v_ai_messages
    )
    ON CONFLICT (date)
    DO UPDATE SET
        mrr = EXCLUDED.mrr,
        platform_gmv = EXCLUDED.platform_gmv,
        new_users = EXCLUDED.new_users,
        new_subscriptions = EXCLUDED.new_subscriptions,
        active_shops = EXCLUDED.active_shops,
        total_shops = EXCLUDED.total_shops,
        total_orders = EXCLUDED.total_orders,
        total_conversations = EXCLUDED.total_conversations,
        ai_messages_processed = EXCLUDED.ai_messages_processed;
END;
$$;

-- ============================================
-- BACKUP & RECOVERY FUNCTIONS
-- ============================================

-- Create a backup snapshot
CREATE OR REPLACE FUNCTION create_backup_snapshot(
    p_snapshot_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_shop_ids UUID[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_snapshot_id UUID;
    v_backup_log_id UUID;
BEGIN
    -- Create backup log entry
    INSERT INTO backup_logs (backup_type, status, started_at)
    VALUES ('manual', 'in_progress', NOW())
    RETURNING id INTO v_backup_log_id;
    
    -- Create recovery snapshot
    INSERT INTO recovery_snapshots (
        snapshot_name,
        description,
        shop_ids,
        backup_log_id,
        can_restore_to_timestamp,
        expires_at
    ) VALUES (
        p_snapshot_name,
        p_description,
        p_shop_ids,
        v_backup_log_id,
        NOW(),
        NOW() + INTERVAL '90 days' -- Keep for 90 days
    )
    RETURNING id INTO v_snapshot_id;
    
    -- Update backup log as completed
    UPDATE backup_logs
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = v_backup_log_id;
    
    RETURN v_snapshot_id;
END;
$$;

-- Cleanup old snapshots
CREATE OR REPLACE FUNCTION cleanup_expired_snapshots()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    DELETE FROM recovery_snapshots
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Get shop statistics
CREATE OR REPLACE FUNCTION get_shop_stats(p_shop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_products', (SELECT COUNT(*) FROM items WHERE shop_id = p_shop_id AND item_type = 'product'),
        'total_services', (SELECT COUNT(*) FROM items WHERE shop_id = p_shop_id AND item_type = 'service'),
        'total_orders', (SELECT COUNT(*) FROM form_submissions WHERE shop_id = p_shop_id),
        'total_revenue', (SELECT COALESCE(SUM(revenue), 0) FROM daily_sales_metrics WHERE shop_id = p_shop_id),
        'total_conversations', (SELECT COUNT(*) FROM conversations WHERE shop_id = p_shop_id),
        'low_stock_count', (SELECT COUNT(*) FROM items WHERE shop_id = p_shop_id AND stock > 0 AND stock <= 10)
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$;

COMMENT ON FUNCTION update_stock IS 'Updates item stock and records history';
COMMENT ON FUNCTION process_order_stock_changes IS 'Bulk stock update for order processing with rollback support';
COMMENT ON FUNCTION get_low_stock_items IS 'Returns items with stock below threshold';
COMMENT ON FUNCTION generate_daily_sales_metrics IS 'Pre-aggregates daily sales data for performance';
COMMENT ON FUNCTION generate_product_analytics IS 'Generates product-level performance metrics';
COMMENT ON FUNCTION generate_platform_metrics IS 'Generates platform-wide admin metrics';
COMMENT ON FUNCTION create_backup_snapshot IS 'Creates a point-in-time recovery snapshot';
COMMENT ON FUNCTION cleanup_expired_snapshots IS 'Removes expired backup snapshots';
