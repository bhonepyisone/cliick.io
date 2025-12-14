// Supabase Edge Function: Admin Operations
// Handles platform metrics, backup operations (service_role only)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminRequest {
  action: 'generate_platform_metrics' | 'create_backup' | 'cleanup_snapshots' | 'get_platform_stats';
  date?: string;
  snapshotName?: string;
  description?: string;
  shopIds?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create admin client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Still verify user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    // ✅ ADMIN CHECK: Verify user has platform admin privileges
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, username, is_admin')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Profile not found' 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user is a platform admin
    if (!profile.is_admin) {
      console.warn(`❌ Unauthorized admin operation attempt by user: ${user.id} (${profile.username})`);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Admin access required',
          message: 'You do not have permission to perform admin operations. Contact a platform administrator.'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`✅ Admin operation authorized for user: ${user.id} (${profile.username})`);

    const body: AdminRequest = await req.json();

    let result;

    switch (body.action) {
      case 'generate_platform_metrics':
        // Generate platform-wide metrics
        if (!body.date) {
          throw new Error('date is required for generate_platform_metrics');
        }

        const { error: metricsError } = await supabaseAdmin.rpc('generate_platform_metrics', {
          p_date: body.date,
        });

        if (metricsError) throw metricsError;
        
        // ✅ AUDIT LOG: Record metrics generation
        await supabaseAdmin
          .from('admin_audit_log')
          .insert({
            admin_user_id: user.id,
            action: 'generate_platform_metrics',
            resource: `metrics_${body.date}`,
            details: { date: body.date },
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
            user_agent: req.headers.get('user-agent')
          });
        
        result = { message: 'Platform metrics generated successfully' };
        break;

      case 'create_backup':
        // Create a backup snapshot
        if (!body.snapshotName) {
          throw new Error('snapshotName is required for create_backup');
        }

        const { data: backupData, error: backupError } = await supabaseAdmin.rpc(
          'create_backup_snapshot',
          {
            p_snapshot_name: body.snapshotName,
            p_description: body.description || null,
            p_shop_ids: body.shopIds || null,
          }
        );

        if (backupError) throw backupError;
        
        // ✅ AUDIT LOG: Record backup creation
        await supabaseAdmin
          .from('admin_audit_log')
          .insert({
            admin_user_id: user.id,
            action: 'create_backup',
            resource: body.snapshotName,
            details: { 
              snapshot_name: body.snapshotName,
              description: body.description,
              shop_ids: body.shopIds,
              snapshot_id: backupData
            },
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
            user_agent: req.headers.get('user-agent')
          });
        
        result = { snapshotId: backupData, message: 'Backup created successfully' };
        break;

      case 'cleanup_snapshots':
        // Cleanup expired snapshots
        const { data: cleanupData, error: cleanupError } = await supabaseAdmin.rpc(
          'cleanup_expired_snapshots'
        );

        if (cleanupError) throw cleanupError;
        
        // ✅ AUDIT LOG: Record cleanup operation
        await supabaseAdmin
          .from('admin_audit_log')
          .insert({
            admin_user_id: user.id,
            action: 'cleanup_snapshots',
            resource: 'expired_snapshots',
            details: { deleted_count: cleanupData },
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
            user_agent: req.headers.get('user-agent')
          });
        
        result = { deletedCount: cleanupData, message: 'Cleanup completed successfully' };
        break;

      case 'get_platform_stats':
        // Get platform statistics
        const { data: statsData, error: statsError } = await supabaseAdmin
          .from('platform_metrics')
          .select('*')
          .order('date', { ascending: false })
          .limit(30);

        if (statsError) throw statsError;
        result = statsData;
        break;

      default:
        throw new Error(`Unknown action: ${body.action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
