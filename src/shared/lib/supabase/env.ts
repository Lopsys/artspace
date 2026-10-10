function clean(value: string | undefined) {
  return (value ?? "").trim();
}

export function getSupabaseUrl() {
  return clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabasePublishableKey() {
  return clean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}
