-- ============================================
-- Scheduled Jobs & Automation
-- Using pg_cron extension for automated tasks
-- ============================================

-- Enable pg_cron extension (requires superuser)
-- Run this in Supabase SQL Editor with service role
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- DAILY ANALYTICS AGGREGATION
-- ============================================

-- Schedule daily sales metrics generation (runs at 2 AM every day)
SELECT cron.schedule(
    'generate-daily-sales-metrics',
    '0 2 * * *', -- Cron expression: At 02:00 AM every day
    $$
    DO $$
    DECLARE
        v_shop RECORD;
        v_yesterday DATE;
    BEGIN
        v_yesterday := CURRENT_DATE - INTERVAL '1 day';
        
        -- Loop through all shops and generate metrics
        FOR v_shop IN SELECT id FROM shops
        LOOP
            PERFORM generate_daily_sales_metrics(v_shop.id, v_yesterday);
            PERFORM generate_product_analytics(v_shop.id, v_yesterday);
        END LOOP;
        
        -- Generate platform-wide metrics
        PERFORM generate_platform_metrics(v_yesterday);
        
        RAISE NOTICE 'Daily metrics generated for %', v_yesterday;
    END $$;
    $$
);

-- ============================================
-- AUTOMATED BACKUPS
-- ============================================

-- Full backup every day at 3 AM
SELECT cron.schedule(
    'daily-full-backup',
    '0 3 * * *',
    $$
    DO $$
    DECLARE
        v_snapshot_name TEXT;
    BEGIN
        v_snapshot_name := 'auto_daily_' || TO_CHAR(CURRENT_DATE, 'YYYY_MM_DD');
        
        PERFORM create_backup_snapshot(
            v_snapshot_name,
            'Automated daily full backup',
            NULL -- All shops
        );
        
        RAISE NOTICE 'Daily backup created: %', v_snapshot_name;
    END $$;
    $$
);

-- Weekly backup on Sundays at 4 AM
SELECT cron.schedule(
    'weekly-backup',
    '0 4 * * 0',
    $$
    DO $$
    DECLARE
        v_snapshot_name TEXT;
    BEGIN
        v_snapshot_name := 'auto_weekly_' || TO_CHAR(CURRENT_DATE, 'YYYY_WW');
        
        PERFORM create_backup_snapshot(
            v_snapshot_name,
            'Automated weekly backup',
            NULL
        );
        
        RAISE NOTICE 'Weekly backup created: %', v_snapshot_name;
    END $$;
    $$
);

-- ============================================
-- CLEANUP JOBS
-- ============================================

-- Cleanup expired snapshots daily at 5 AM
SELECT cron.schedule(
    'cleanup-expired-snapshots',
    '0 5 * * *',
    $$
    SELECT cleanup_expired_snapshots();
    $$
);

-- Cleanup old stock history (keep last 365 days) - runs monthly
SELECT cron.schedule(
    'cleanup-old-stock-history',
    '0 6 1 * *', -- First day of month at 6 AM
    $$
    DELETE FROM stock_history
    WHERE timestamp < NOW() - INTERVAL '365 days';
    $$
);

-- ============================================
-- LOW STOCK ALERTS (Example - commented out)
-- ============================================

-- Uncomment to enable automatic low stock notifications
-- Runs every day at 9 AM
/*
SELECT cron.schedule(
    'check-low-stock-alerts',
    '0 9 * * *',
    $$
    DO $$
    DECLARE
        v_shop RECORD;
        v_low_stock_items RECORD;
        v_alert_count INT;
    BEGIN
        FOR v_shop IN SELECT id, name FROM shops WHERE subscription_status = 'active'
        LOOP
            v_alert_count := 0;
            
            FOR v_low_stock_items IN 
                SELECT * FROM get_low_stock_items(v_shop.id, 10)
            LOOP
                v_alert_count := v_alert_count + 1;
                
                -- Here you would insert into a notifications table
                -- or call an external notification service
                RAISE NOTICE 'Low stock alert for shop %: Item % has only % units',
                    v_shop.name, v_low_stock_items.name, v_low_stock_items.stock;
            END LOOP;
            
            IF v_alert_count > 0 THEN
                RAISE NOTICE 'Shop % has % low stock items', v_shop.name, v_alert_count;
            END IF;
        END LOOP;
    END $$;
    $$
);
*/

-- ============================================
-- VIEW SCHEDULED JOBS
-- ============================================

-- Query to see all scheduled jobs
-- SELECT * FROM cron.job ORDER BY schedule;

-- ============================================
-- UNSCHEDULE JOBS (for maintenance)
-- ============================================

-- Uncomment to remove a scheduled job
-- SELECT cron.unschedule('generate-daily-sales-metrics');
-- SELECT cron.unschedule('daily-full-backup');
-- SELECT cron.unschedule('weekly-backup');
-- SELECT cron.unschedule('cleanup-expired-snapshots');
-- SELECT cron.unschedule('cleanup-old-stock-history');

-- ============================================
-- MANUAL TRIGGERS (for testing)
-- ============================================

-- Manually run daily aggregation for a specific date
-- SELECT generate_daily_sales_metrics('shop-uuid-here', '2025-12-08'::DATE);

-- Manually create a backup
-- SELECT create_backup_snapshot('manual_backup_test', 'Manual test backup');

-- Manually cleanup expired snapshots
-- SELECT cleanup_expired_snapshots();

COMMENT ON EXTENSION pg_cron IS 'Automated scheduled jobs for analytics and backups';
