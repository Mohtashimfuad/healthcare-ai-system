// lib/supabase/client.ts
// Browser-side Supabase client — use in Client Components only.

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Returns a singleton browser Supabase client.
 * Safe to call multiple times — only one instance is ever created.
 *
 * @example
 * 'use client';
 * const supabase = createClient();
 * const { data } = await supabase.from('profiles').select('*');
 */
export function createClient() {
  if (client) return client;

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return client;
}
