// Supabase Edge Function: Inventory Operations
// Handles stock updates, history tracking, and low stock alerts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateStockRequest {
  action: 'update' | 'process_order' | 'get_low_stock';
  itemId?: string;
  change?: number;
  reason?: string;
  orderItems?: Array<{ item_id: string; quantity: number }>;
  orderId?: string;
  shopId?: string;
  threshold?: number;
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

    const body: UpdateStockRequest = await req.json();

    let result;

    switch (body.action) {
      case 'update':
        // Update single item stock
        if (!body.itemId || body.change === undefined || !body.reason) {
          throw new Error('Missing required fields for update');
        }

        const { data: updateData, error: updateError } = await supabaseClient.rpc(
          'update_stock',
          {
            p_item_id: body.itemId,
            p_change: body.change,
            p_reason: body.reason,
            p_changed_by: user.id,
          }
        );

        if (updateError) throw updateError;
        result = updateData;
        break;

      case 'process_order':
        // Bulk stock update for order processing
        if (!body.orderItems || !body.orderId || !body.shopId) {
          throw new Error('Missing required fields for process_order');
        }

        const { data: orderData, error: orderError } = await supabaseClient.rpc(
          'process_order_stock_changes',
          {
            p_order_items: body.orderItems,
            p_order_id: body.orderId,
            p_shop_id: body.shopId,
          }
        );

        if (orderError) throw orderError;
        result = orderData;
        break;

      case 'get_low_stock':
        // Get low stock items
        if (!body.shopId) {
          throw new Error('Missing shopId for get_low_stock');
        }

        const { data: lowStockData, error: lowStockError } = await supabaseClient.rpc(
          'get_low_stock_items',
          {
            p_shop_id: body.shopId,
            p_threshold: body.threshold || 10,
          }
        );

        if (lowStockError) throw lowStockError;
        result = lowStockData;
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
