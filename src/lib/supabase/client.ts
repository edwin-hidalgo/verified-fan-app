/**
 * supabase/client.ts — Browser Supabase client
 *
 * Used for client-side operations in React components.
 * Uses the anon key (publicly available).
 */

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
    return {} as any
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
    } catch (err) {
      console.error('Failed to create Supabase client:', err)
      return {} as any
    }
  }

  return supabaseClient
}

// Export a lazy-initialized client
export const supabase: ReturnType<typeof createBrowserClient> = new Proxy(
  {} as any,
  {
    get: (target, prop) => getSupabaseClient()[prop as string],
  }
)
