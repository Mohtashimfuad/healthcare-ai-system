// lib/supabase/server.ts
// Server-side Supabase client — use in Server Components, Route Handlers, and Server Actions.
// Next.js 15: cookies() is async and must be awaited.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types';

/**
 * Creates a server-side Supabase client.
 * Must be called (and awaited) at the top of every Server Component
 * or Route Handler that needs database access.
 *
 * @example
 * // app/dashboard/page.tsx
 * export default async function Page() {
 *   const supabase = await createClient();
 *   const { data } = await supabase.from('profiles').select('*');
 * }
 */
export async function createClient() {
  // Next.js 15 requires awaiting cookies()
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where setting cookies isn't allowed.
            // The middleware will handle the session refresh instead.
          }
        },
      },
    },
  );
}
