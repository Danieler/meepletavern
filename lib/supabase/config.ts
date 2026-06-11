const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublicKey);

export function getSupabaseConfig() {
  return {
    url: supabaseUrl ?? "https://placeholder.supabase.co",
    key: supabasePublicKey ?? "placeholder-public-key"
  };
}
