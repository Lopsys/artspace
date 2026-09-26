import sharp from "sharp";
import { getServiceClient } from "@/shared/lib/supabase/admin";
import type { SavedPublicProfile } from "@/features/public/team-profiles";

const BUCKET = "profile-media";

type Bucket = NonNullable<Awaited<ReturnType<typeof openBucket>>>;

let opened: Promise<Bucket | null> | null = null;

async function openBucket() {
  const admin = getServiceClient();
  if (!admin) return null;
  const listed = await admin.storage.listBuckets();
  if (listed.error) throw new Error(listed.error.message);
  if (!listed.data?.some((item) => item.name === BUCKET)) {
    const created = await admin.storage.createBucket(BUCKET, { public: true });
    if (created.error && !created.error.message.toLowerCase().includes("already exists")) {
      throw new Error(created.error.message);
    }
  }
  return admin.storage.from(BUCKET);
}

function bucket() {
  opened ??= openBucket().catch((error) => {
    opened = null;
    throw error;
  });
  return opened;
}

export async function readManifest(professionalId: string): Promise<SavedPublicProfile | null> {
  try {
    const storage = await bucket();
    if (!storage) return null;
    const file = await storage.download(`${professionalId}/manifest.json`);
    if (file.error || !file.data) return null;
    return JSON.parse(await file.data.text()) as SavedPublicProfile;
  } catch {
    return null;
  }
}

export async function writeManifest(professionalId: string, manifest: SavedPublicProfile) {
  const storage = await bucket();
  if (!storage) throw new Error("Para salvar o perfil, cole SUPABASE_SERVICE_ROLE_KEY no .env.local.");
  const uploaded = await storage.upload(
    `${professionalId}/manifest.json`,
    JSON.stringify(manifest),
    { contentType: "application/json", upsert: true },
  );
  if (uploaded.error) throw new Error(uploaded.error.message);
}

export async function uploadProfileImage(professionalId: string, file: File) {
  const storage = await bucket();
  if (!storage) throw new Error("Para enviar a foto, cole SUPABASE_SERVICE_ROLE_KEY no .env.local.");
  const input = Buffer.from(await file.arrayBuffer());
  const image = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  const path = `${professionalId}/${Date.now()}.jpg`;
  const uploaded = await storage.upload(path, image, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (uploaded.error) throw new Error(uploaded.error.message);
  const url = storage.getPublicUrl(path).data.publicUrl;
  return url;
}

export async function readAvatars(professionalIds: string[]) {
  const entries = await Promise.all(
    professionalIds.map(async (id) => {
      const manifest = await readManifest(id);
      return [id, manifest?.avatarUrl ?? null] as const;
    }),
  );
  return new Map(entries);
}
