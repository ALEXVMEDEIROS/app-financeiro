import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Painel · Sobra Vida",
  robots: { index: false, follow: false },
};

// Versão mínima do painel (F1): confirma que o login funciona e que o
// cadastro automático criou o plano de contas. O painel de verdade vem na F3.
async function Boas_vindas() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const usuarioId = data?.claims?.sub;
  if (!usuarioId) redirect("/entrar?proxima=/painel");

  const [{ data: perfil }, { count: grupos }, { count: categorias }] = await Promise.all([
    supabase.from("perfis").select("nome").eq("id", usuarioId).single(),
    supabase.from("grupos").select("*", { count: "exact", head: true }),
    supabase.from("categorias").select("*", { count: "exact", head: true }),
  ]);

  const primeiroNome = (perfil?.nome ?? "").split(" ")[0] || "por aqui";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Olá, {primeiroNome}!
      </h1>
      <p className="text-lg text-muted">Sua conta no Sobra Vida está ativa.</p>
      <div className="rounded-xl border border-line bg-surface p-5">
        <p className="font-semibold">Seu plano de contas já está pronto</p>
        <p className="text-muted">
          {grupos ?? 0} grupos e {categorias ?? 0} categorias, que você poderá ajustar quando as
          telas de lançamento chegarem.
        </p>
      </div>
      <p className="text-sm text-muted">
        Esta é uma versão de testes. Os lançamentos e o painel completo vêm nas próximas etapas.
      </p>
    </div>
  );
}

export default function PaginaPainel() {
  return (
    <main className="flex flex-1 items-center px-4 py-12">
      <div className="mx-auto w-full max-w-xl">
        <Suspense fallback={<p className="text-muted">Carregando…</p>}>
          <Boas_vindas />
        </Suspense>
      </div>
    </main>
  );
}
