"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Field } from "@/shared/components/ui/input";
import { getSupabase } from "@/shared/lib/supabase/client";
import { initials } from "@/features/public/portraits";
import type { ProfileBlock, SavedPortfolioItem } from "@/features/public/team-profiles";
import {
  fetchEditableProfile,
  saveEditableProfile,
  uploadProfilePhoto,
} from "@/features/profile/profile-api";

export function ProfileEditor() {
  const [name, setName] = useState("");
  const [canEditPortfolio, setCanEditPortfolio] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<ProfileBlock[]>([]);
  const [portfolio, setPortfolio] = useState<SavedPortfolioItem[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    void fetchEditableProfile()
      .then((profile) => {
        setName(profile.name);
        setCanEditPortfolio(profile.canEditPortfolio);
        setAvatarUrl(profile.avatarUrl);
        setBlocks(profile.blocks);
        setPortfolio(profile.portfolio);
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "Não foi possível abrir o perfil.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function pick(file: File | undefined, apply: (url: string) => void) {
    if (!file) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      apply(await uploadProfilePhoto(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (nextPassword.length < 6) {
      setError("A nova senha precisa ter pelo menos 6 caracteres.");
      setNotice("");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("A confirmação da senha não confere.");
      setNotice("");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) {
        setError("Sessão expirada. Entre de novo.");
        return;
      }
      const current = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (current.error) {
        setError("Senha atual incorreta.");
        return;
      }
      const updated = await supabase.auth.updateUser({ password: nextPassword });
      if (updated.error) {
        setError(updated.error.message);
        return;
      }
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setNotice("Senha alterada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar a senha.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveEditableProfile({ avatarUrl, blocks, portfolio });
      setNotice("Perfil salvo. A página pública já usa estas fotos e textos.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando perfil…</p>;
  }

  return (
    <section className="mx-auto grid max-w-3xl gap-8">
      <div>
        <p className="text-xs tracking-[0.25em] text-gold">PÁGINA PÚBLICA</p>
        <h1 className="font-serif text-3xl tracking-wide">Perfil</h1>
        <p className="mt-2 text-sm text-muted">
          {canEditPortfolio
            ? "A foto aparece em Quem atende. Os textos, as imagens ao lado e o portfólio aparecem no Ver mais."
            : "Como barbeiro, você altera a foto que aparece em Quem atende."}
        </p>
      </div>

      <div className="grid justify-items-center gap-4 rounded-[2rem] border border-line bg-ink-soft p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:justify-items-start">
        <div className="relative h-36 w-36 overflow-hidden rounded-full border-2 border-gold/55 bg-ink">
          {avatarUrl ? (
            // Remote studio photos and local portraits share this preview.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full place-items-center font-serif text-3xl text-gold">
              {initials(name || "?")}
            </span>
          )}
        </div>
        <label className="grid gap-2 text-sm">
          <span className="text-cream">{name || "Foto de perfil"}</span>
          <span className="text-muted">JPG, PNG ou WebP, até 8 MB.</span>
          <input
            type="file"
            accept="image/*"
            className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-sm file:text-ink"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              void pick(file, setAvatarUrl);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {canEditPortfolio && (
        <>
          <div className="grid gap-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-serif text-2xl">Textos e imagens</h2>
              <Button
                variant="line"
                disabled={busy}
                onClick={() =>
                  setBlocks((current) => [...current, { text: "", image: "", alt: "Trabalho" }])
                }
              >
                Adicionar bloco
              </Button>
            </div>
            {blocks.map((block, index) => (
              <article
                key={`${index}-${block.image}`}
                className="grid gap-4 rounded-[2rem] border border-line bg-ink-soft p-4 sm:grid-cols-2"
              >
                <label className="grid gap-2 text-sm">
                  <span className="text-muted">Texto</span>
                  <textarea
                    value={block.text}
                    rows={6}
                    className="rounded-2xl border border-line bg-ink px-3 py-2 text-cream outline-none focus:border-gold/70"
                    onChange={(event) =>
                      setBlocks((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, text: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>
                <div className="grid content-start gap-3">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-ink">
                    {block.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={block.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full place-items-center text-sm text-muted">
                        Sem imagem
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    aria-label={`Imagem do bloco ${index + 1}`}
                    className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:text-cream"
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      void pick(file, (url) =>
                        setBlocks((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, image: url } : item,
                          ),
                        ),
                      );
                      event.target.value = "";
                    }}
                  />
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() =>
                      setBlocks((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    Remover bloco
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <div className="grid gap-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-serif text-2xl">Portfólio</h2>
              <label className="inline-flex h-10 cursor-pointer items-center rounded-full border border-line px-4 text-sm text-cream hover:border-gold/60">
                Adicionar foto
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    void pick(file, (url) =>
                      setPortfolio((current) => [...current, { src: url, alt: "Trabalho" }]),
                    );
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {portfolio.map((item, index) => (
                <li key={`${item.src}-${index}`} className="grid gap-2">
                  <div className="relative aspect-square overflow-hidden rounded-3xl border border-line bg-ink">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.src} alt={item.alt} className="h-full w-full object-cover" />
                  </div>
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() =>
                      setPortfolio((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="grid gap-3 rounded-[2rem] border border-line bg-ink-soft p-6">
        <h2 className="font-serif text-2xl">Senha</h2>
        <Field
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <Field
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={nextPassword}
          onChange={(event) => setNextPassword(event.target.value)}
        />
        <Field
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <div>
          <Button variant="line" onClick={() => void changePassword()} disabled={busy}>
            Alterar senha
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {notice && <p className="text-sm text-ok">{notice}</p>}
      <div>
        <Button onClick={() => void save()} disabled={busy}>
          {busy ? "Salvando…" : "Salvar perfil"}
        </Button>
      </div>
    </section>
  );
}
