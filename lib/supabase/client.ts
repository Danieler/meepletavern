"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

const { url, key } = getSupabaseConfig();

export const supabase = createBrowserClient(url, key);
export { isSupabaseConfigured };
