// Supabase Edge Function: Analytics Operations
// Handles sales metrics, product analytics, and report generation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsRequest {
  action: 'generate_daily' | 'generate_product' | 'get_metrics' | 'get_shop_stats';
  shopId: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    const body: AnalyticsRequest = await req.json();

    if (!body.shopId) {
      throw new Error('shopId is required');
    }

    // Verify user has access to this shop
    const { data: shopAccess, error: accessError } = await supabaseClient
      .from('shops')
      .select('id')
      .or(`owner_id.eq.${user.id},id.in.(select shop_id from team_members where user_id = '${user.id}')`)
      .eq('id', body.shopId)
      .single();

    if (accessError || !shopAccess) {
      throw new Error('Access denied to this shop');
    }

    let result;

    switch (body.action) {
      case 'generate_daily':
        // Generate daily sales metrics
        if (!body.date) {
          throw new Error('date is required for generate_daily');
        }

        const { error: dailyError } = await supabaseClient.rpc('generate_daily_sales_metrics', {
          p_shop_id: body.shopId,
          p_date: body.date,
        });

        if (dailyError) throw dailyError;
        result = { message: 'Daily metrics generated successfully' };
        break;

      case 'generate_product':
        // Generate product analytics
        if (!body.date) {
          throw new Error('date is required for generate_product');
        }

        const { error: productError } = await supabaseClient.rpc('generate_product_analytics', {
          p_shop_id: body.shopId,
          p_date: body.date,
        });

        if (productError) throw productError;
        result = { message: 'Product analytics generated successfully' };
        break;

      case 'get_metrics':
        // Get sales metrics for date range
        if (!body.startDate || !body.endDate) {
          throw new Error('startDate and endDate are required for get_metrics');
        }

        const { data: metricsData, error: metricsError } = await supabaseClient.rpc(
          'get_sales_metrics',
          {
            p_shop_id: body.shopId,
            p_start_date: body.startDate,
            p_end_date: body.endDate,
          }
        );

        if (metricsError) throw metricsError;
        result = metricsData;
        break;

      case 'get_shop_stats':
        // Get shop statistics
        const { data: statsData, error: statsError } = await supabaseClient.rpc('get_shop_stats', {
          p_shop_id: body.shopId,
        });

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
