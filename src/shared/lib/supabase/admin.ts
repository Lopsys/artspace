import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/shared/lib/supabase/env";

export function getServiceClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return null;
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getUserClient(token: string): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key || !token) return null;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function bearerToken(request: Request) {
  return request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

export async function getRequestUser(request: Request) {
  const token = bearerToken(request);
  const client = getUserClient(token);
  if (!client) return { token, user: null as { id: string; email?: string } | null };
  const {
    data: { user },
  } = await client.auth.getUser(token);
  return { token, user };
}
