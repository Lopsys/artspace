import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/shared/lib/supabase/env";

function readEnvFile(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]?.trim()) process.env[key] = value;
  }
}

function ensureServerEnv() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    return;
  }
  readEnvFile(path.join(process.cwd(), ".env.local"));
}

export function getServiceClient(): SupabaseClient | null {
  ensureServerEnv();
  const url = getSupabaseUrl();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !service) return null;
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getUserClient(token: string): SupabaseClient | null {
  ensureServerEnv();
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
