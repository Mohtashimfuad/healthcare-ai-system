// src/lib/supabase/admin.ts
// Privileged Supabase client for administrative/background tasks (bypasses RLS where necessary)

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

/**
 * Creates a Supabase client using the service role key.
 * Use ONLY in server-side API routes for trusted operations
 * (e.g. background notification checks, RAG embedding indexing, or system tasks).
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
