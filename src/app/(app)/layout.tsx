import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AjustesCelular, BarraInferior, BotaoNovoCabecalho, MenuPrincipal } from "@/components/navegacao";
import { createClient } from "@/lib/supabase/server";
import { sair } from "./acoes";

// Layout da área logada. A proteção principal é o proxy (src/proxy.ts), que
// exige login em toda página que não seja pública. Aqui só montamos o visual.

async function Usuario() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const usuarioId = data?.claims?.sub;
  if (!usuarioId) redirect("/entrar");

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome")
    .eq("id", usuarioId)
    .single();
  const nome = perfil?.nome?.trim() || "Minha conta";

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-40 truncate text-sm text-muted xl:inline" title={nome}>
        {nome}
      </span>
      <form action={sair}>
        <button
          type="submit"
          className="min-h-10 rounded-lg border border-line px-3 text-sm font-semibold hover:border-muted"
        >
          Sair
        </button>
      </form>
    </div>
  );
}

export default function LayoutAreaLogada({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-4">
            <Link href="/painel" className="font-display text-lg font-extrabold tracking-tight">
              Sobra Vida
            </Link>
            <MenuPrincipal />
          </div>
          <div className="flex items-center gap-3">
            <BotaoNovoCabecalho />
            <AjustesCelular />
            <Suspense fallback={<div className="h-10 w-16" />}>
              <Usuario />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 lg:pb-10">{children}</main>
      <BarraInferior />
    </div>
  );
}
