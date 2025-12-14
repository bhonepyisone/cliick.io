// Follow Deno deploy requirements
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // ✅ ADMIN CHECK: Verify user has platform admin privileges (only for updates)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id, username, is_admin')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { action, settings } = await req.json()

    // Platform settings are stored as a single JSON document
    // We'll use a simple key-value approach with a special ID
    const SETTINGS_ID = 'platform_settings_global'

    if (action === 'get') {
      // Fetch platform settings - allowed for all authenticated users
      const { data, error } = await supabaseClient
        .from('platform_config')
        .select('settings')
        .eq('id', SETTINGS_ID)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!data) {
        // Return default settings if not found
        const defaultSettings = getDefaultSettings()
        return new Response(
          JSON.stringify({ settings: defaultSettings }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ settings: data.settings }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update') {
      // Check if user is a platform admin
      if (!profile.is_admin) {
        console.warn(`❌ Unauthorized admin access attempt by user: ${user.id} (${profile.username})`);
        
        return new Response(
          JSON.stringify({ 
            error: 'Admin access required',
            message: 'You do not have permission to update platform settings. Contact a platform administrator.'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`✅ Admin access granted to user: ${user.id} (${profile.username})`);
      
      // Update platform settings
      const { error } = await supabaseClient
        .from('platform_config')
        .upsert({
          id: SETTINGS_ID,
          settings,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })

      if (error) {
        throw error
      }

      // ✅ AUDIT LOG: Record admin action
      await supabaseClient
        .from('admin_audit_log')
        .insert({
          admin_user_id: user.id,
          action: 'update_platform_settings',
          resource: SETTINGS_ID,
          details: {
            updated_fields: Object.keys(settings || {}),
            timestamp: new Date().toISOString()
          },
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent')
        })

      console.log(`📝 Platform settings updated by admin: ${user.id}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to return minimal defaults
function getDefaultSettings() {
  return {
    announcement: { id: `announcement_${Date.now()}`, message: 'Welcome to Cliick.io!', enabled: false },
    maintenanceMode: false,
    currency: 'MMK',
    paymentMethods: [
      { id: 'kbz', name: 'KBZ Pay', details: 'KBZ Pay account', qrCodeUrl: '', enabled: true },
    ],
    aiConfig: {
      globalSystemInstruction: 'You are a helpful AI assistant.',
      forbiddenTopics: 'politics, religion, hate speech',
      mandatorySafetyResponse: "I'm sorry, I cannot discuss that topic.",
      toneConfigs: [],
      aiPermissions: {
        allowProductCatalog: true,
        allowTrainingData: true,
        allowConversationalOrdering: true,
      },
      modelAssignments: {
        generalChatStandard: { provider: 'Google Gemini', modelName: 'gemini-2.5-flash' },
      },
    },
    subscriptionPlans: [],
    dataHistoryTiers: [],
    planEntitlements: {},
    localization: {
      enabledLanguages: ['en', 'my'],
      enabledCurrencies: ['MMK', 'USD'],
    },
  }
}
