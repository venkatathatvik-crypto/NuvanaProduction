import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*, user_roles(role)')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    const userRole = profile.user_roles?.role;
    // Only Super Admin or School Admin can create users
    if (userRole !== 'super_admin' && userRole !== 'school_admin') {
         throw new Error('Forbidden: Insufficient role')
    }

    // Parse request
    const { email, password, role, name, school_id, class_id } = await req.json()

    let targetSchoolId = school_id;

    // School Admin is forced to create users in their own school
    if (userRole === 'school_admin') {
        targetSchoolId = profile.school_id;
    }

    // Initialize Admin Client for creation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Map role string to ID
    let roleId = 4; // default student
    if (role === 'teacher') roleId = 3;
    if (role === 'school_admin') roleId = 2;
    if (role === 'super_admin') roleId = 1;

    // Create Auth User
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, name, school_id: targetSchoolId }
    })

    if (createError) throw createError

    // Create Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email,
        name,
        role_id: roleId,
        school_id: targetSchoolId,
        class_id: class_id || null // Optional for students
      })

    if (profileError) {
        throw profileError
    }

    return new Response(
      JSON.stringify(newUser),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
