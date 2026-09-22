// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This code runs on Supabase Edge Functions (Deno runtime)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Create client with service role to manage auth users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Extract authorization header to inspect calling user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          code: 'P0001',
          message: 'Only root admin anupamsaxena.dev@gmail.com can provision new administrators',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify calling user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    const callerEmail = user?.email?.toLowerCase().trim() || '';

    // STRICT SERVER-SIDE ENFORCEMENT
    if (callerEmail !== 'anupamsaxena.dev@gmail.com') {
      return new Response(
        JSON.stringify({
          code: 'P0001',
          message: 'Only root admin anupamsaxena.dev@gmail.com can provision new administrators',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse target user credentials
    const { target_email, target_password } = await req.json();

    if (!target_email || !target_password) {
      return new Response(
        JSON.stringify({ code: '22023', message: 'target_email and target_password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanTargetEmail = target_email.toLowerCase().trim();

    // Create or update admin user in Supabase Auth via Admin API
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanTargetEmail,
      password: target_password,
      email_confirm: true,
      user_metadata: {
        name: cleanTargetEmail.split('@')[0],
        role: 'ADMIN',
        is_sub_admin: true,
        provisioned_by: callerEmail,
        provisioned_at: new Date().toISOString(),
      },
      app_metadata: {
        role: 'ADMIN',
        provider: 'email',
        providers: ['email'],
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ code: createError.status || 400, message: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert into public.users and public.staff_members
    await supabaseAdmin.from('users').upsert({
      id: newUserData.user.id,
      email: cleanTargetEmail,
      name: cleanTargetEmail.split('@')[0],
      role: 'ADMIN',
      updated_at: new Date().toISOString(),
    });

    await supabaseAdmin.from('staff_members').upsert({
      id: newUserData.user.id,
      email: cleanTargetEmail,
      name: cleanTargetEmail.split('@')[0],
      role: 'ADMIN',
      designation: 'Secondary Administrator',
      is_active: true,
      is_blocked: false,
      updated_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserData.user.id,
        email: cleanTargetEmail,
        role: 'ADMIN',
        provisioned_by: callerEmail,
        message: 'Sub-admin successfully provisioned with full administrator access.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
