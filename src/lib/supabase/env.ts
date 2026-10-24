export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

// Lets pages render a "connect Supabase" notice instead of crashing before .env.local exists.
export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseKey);
