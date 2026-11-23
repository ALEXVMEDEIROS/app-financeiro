import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sair } from "./acoes";

// Layout da área logada. Toda página dentro de src/app/(app) passa por aqui:
// sem sessão válida, vai para /entrar. (O proxy já faz essa proteção; esta é
// uma segunda barreira, que não depende da lista de caminhos do proxy.)

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
      <span className="hidden max-w-48 truncate text-sm text-muted sm:inline" title={nome}>
        {nome}
      </span>
      <form action={sair}>
        <button
          type="submit"
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-muted"
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
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/painel" className="font-display text-lg font-extrabold tracking-tight">
              Sobra Vida
            </Link>
            <nav aria-label="Principal" className="flex items-center gap-4 text-sm font-semibold">
              <Link href="/painel" className="text-fg">
                Painel
              </Link>
            </nav>
          </div>
          <Suspense fallback={<div className="h-8 w-16" />}>
            <Usuario />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
