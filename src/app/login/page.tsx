"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useStudio } from "@/features/studio/store";
import { Button } from "@/shared/components/ui/button";
import { Field } from "@/shared/components/ui/input";

function LoginForm() {
  const { login } = useStudio();
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    if (busy) return;
    setBusy(true);
    setError("");
    const result = await login(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const next = search.get("next") || "";
    if (result.kind === "client") {
      router.replace(next.startsWith("/app") || !next ? "/conta" : next);
      return;
    }
    router.replace(next.startsWith("/app") ? next : "/app");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="w-full max-w-md text-center">
        <Image
          src="/logo.png"
          alt="Artspace Barbearia"
          width={160}
          height={160}
          className="mx-auto"
          priority
        />
        <h1 className="mt-2 font-serif text-4xl tracking-[0.28em] text-cream">
          ARTSPACE
        </h1>
        <div className="mt-3 flex items-center justify-center gap-3 text-gold">
          <span className="h-px w-10 bg-gold" />
          <p className="text-sm tracking-[0.22em]">Barbearia</p>
          <span className="h-px w-10 bg-gold" />
        </div>
        <p className="mt-4 text-sm text-muted">
          Cliente?{" "}
          <Link href="/#agendar" className="text-gold">
            Agende na landing
          </Link>
          {" · "}
          <Link href="/conta" className="text-gold">
            Meus horários
          </Link>
        </p>

        <form
          className="mt-10 grid gap-3 text-left"
          onSubmit={(event) => {
            event.preventDefault();
            void go();
          }}
        >
          <Field
            label="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Field
            label="Senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="mt-2 h-11" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
