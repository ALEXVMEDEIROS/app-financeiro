import { Suspense } from "react";
import { connection } from "next/server";

// Verifica se o app alcança o Supabase com as variáveis de ambiente configuradas.
async function StatusBanco() {
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let ok = false;
  let motivo = "";
  if (!url || !key) {
    motivo = `falta ${[!url && "NEXT_PUBLIC_SUPABASE_URL", !key && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].filter(Boolean).join(" e ")}`;
  } else {
    try {
      const r = await fetch(`${url.trim()}/auth/v1/settings`, {
        headers: { apikey: key.trim() },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      ok = r.ok;
      if (!ok) motivo = `o Supabase respondeu com erro ${r.status}`;
    } catch {
      motivo = "não foi possível alcançar o endereço do Supabase";
    }
  }
  return (
    <p className="flex items-center gap-2 text-sm text-muted">
      <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${ok ? "bg-pos" : "bg-neg"}`} aria-hidden="true" />
      {ok
        ? `Banco de dados conectado (projeto ${new URL(url!.trim()).hostname.split(".")[0]})`
        : `Banco de dados sem conexão: ${motivo}`}
    </p>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 items-center px-4 py-16">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <p className="flex items-baseline gap-3">
          <span className="font-display text-xl font-extrabold tracking-tight">Sobra Vida</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Em construção</span>
        </p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-balance">
          Finanças em ordem. Sobra mais vida.
        </h1>
        <p className="text-lg text-muted">
          A gestão financeira de uma empresa, aplicada à sua vida: quanto sobrou no mês, o que ainda vai
          entrar e sair até o fim do ano e como está o seu patrimônio. Feito para profissionais liberais e
          autônomos.
        </p>
        <p className="text-muted">Versão de testes prevista para maio de 2027.</p>
        <div className="border-t border-line pt-4">
          <Suspense fallback={<p className="text-sm text-muted">Verificando o banco de dados…</p>}>
            <StatusBanco />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
