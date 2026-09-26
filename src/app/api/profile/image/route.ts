import { NextResponse } from "next/server";
import { uploadProfileImage } from "@/features/profile/media-store";
import { getRequestUser, getServiceClient } from "@/shared/lib/supabase/admin";

export async function POST(request: Request) {
  const admin = getServiceClient();
  const { user } = await getRequestUser(request);
  if (!admin) {
    return NextResponse.json(
      { message: "Para enviar a foto, cole SUPABASE_SERVICE_ROLE_KEY no .env.local." },
      { status: 501 },
    );
  }
  if (!user) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Escolha uma imagem." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ message: "Envie uma imagem." }, { status: 400 });
  }
  if (file.size > 8_000_000) {
    return NextResponse.json({ message: "A imagem precisa ter até 8 MB." }, { status: 400 });
  }

  try {
    const url = await uploadProfileImage(user.id, file);
    return NextResponse.json({ url });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Não foi possível enviar a imagem.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
