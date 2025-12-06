import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Secret access code for super admin registration
// This should match the frontend access code
const SUPER_ADMIN_ACCESS_CODE = "NUVANA_SUPER_2024";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, status: 204 })
  }

  try {
    const { name, email, password, access_code } = await req.json()

    // Validate required fields
    if (!name || !email || !password || !access_code) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, email, password, access_code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate access code
    if (access_code !== SUPER_ADMIN_ACCESS_CODE) {
      return new Response(
        JSON.stringify({ error: 'Invalid access code. Contact platform administrator.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Initialize Admin Client with Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create Auth User using Admin API (Service Role)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for super admin
      user_metadata: { role: 'super_admin', name }
    })

    if (createError) {
      throw new Error(`Auth error creating user: ${createError.message}`)
    }

    // Create Super Admin Profile
    // role_id: 1=super_admin, 2=school_admin, 3=teacher, 4=student
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email,
        name,
        role_id: 1, // super_admin
        school_id: null // Super admins don't belong to a specific school
      })

    if (profileError) {
      // If profile creation fails, we should cleanup the auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw new Error(`Database error creating profile: ${profileError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: newUser.user.id,
        message: 'Super admin account created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in create-super-admin function:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
