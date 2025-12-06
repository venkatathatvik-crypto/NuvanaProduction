import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 🚨 CRITICAL: Handle OPTIONS preflight request with status 204
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, status: 204 })
  }

  try {
    const { name, admin_email, admin_password, admin_name } = await req.json()

    // Validate required fields
    if (!name || !admin_email || !admin_password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, admin_email, admin_password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Admin Client with Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Create School (Tenant)
    const { data: school, error: schoolError } = await supabaseAdmin
        .from('schools')
        .insert({ name })
        .select('id')
        .single()
    
    if (schoolError) throw new Error(`Database error creating school: ${schoolError.message}`)

    // 2. Create Admin User using Admin API (Service Role)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: { role: 'school_admin', name: admin_name || 'School Admin', school_id: school.id }
    })

    if (createError) throw new Error(`Auth error creating user: ${createError.message}`)

    // 3. Create Admin Profile (Link to school and role)
    // role_id: 1=super_admin, 2=school_admin, 3=teacher, 4=student
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUser.user.id,
          email: admin_email,
          name: admin_name || 'School Admin',
          role_id: 2, // school_admin
          school_id: school.id
        })

    if (profileError) throw new Error(`Database error creating profile: ${profileError.message}`)

    // 4. Update school table with admin_profile_id (Optional but helpful)
    const { error: updateSchoolError } = await supabaseAdmin
        .from('schools')
        .update({ admin_profile_id: newUser.user.id })
        .eq('id', school.id);

    if (updateSchoolError) throw new Error(`Database error updating school admin ID: ${updateSchoolError.message}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        school_id: school.id, 
        user_id: newUser.user.id,
        message: 'School and admin created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in create-school function:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})