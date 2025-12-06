---
description: Deploy Supabase Edge Functions
---

# Deploy Edge Functions

This workflow guides you through deploying your Supabase Edge Functions.

## Prerequisites
- Supabase CLI installed.
- Logged in to Supabase (`supabase login`).
- Docker is running (if testing locally).

## Deployment Steps

1. **Link your project** (if not already linked):
   You need your Reference ID from the Supabase Dashboard (Project Settings > General).
   ```bash
   supabase link --project-ref <your-project-id>
   ```

2. **Deploy the `create-user` function**:
   This function handles secure user creation.
   ```bash
   supabase functions deploy create-user --no-verify-jwt
   ```
   *Note: `--no-verify-jwt` is used because we verify the JWT manually inside the function code (or because it's called by the Admin client).*

3. **Deploy the `create-school` function**:
   This function handles school onboarding.
   ```bash
   supabase functions deploy create-school --no-verify-jwt
   ```

4. **Set Secrets (Environment Variables)**:
   Your functions might need the Service Role Key to create users/schools.
   Get your `service_role` key from Supabase Dashboard > Project Settings > API.
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
   ```
   *Check your function code to see which env vars are needed. `SUPABASE_URL` and `SUPABASE_ANON_KEY` are usually auto-injected.*

## Troubleshooting
- **"Function not found"**: Ensure you are running the command from the root of your project where the `supabase` folder is.
- **Permission Denied**: Ensure you are logged in (`supabase login`) and have access to the linked project.
