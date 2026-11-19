import { Suspense } from "react";
import { connection } from "next/server";

// Verifica se o app alcança o Supabase com as variáveis de ambiente configuradas.
async function StatusBanco() {
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let ok = false;
  if (url && key) {
    try {
      const r = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: key },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      ok = r.ok;
    } catch {
      ok = false;
    }
  }
  return (
    <p className="flex items-center gap-2 text-sm text-muted">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-pos" : "bg-neg"}`} aria-hidden="true" />
      {ok ? "Banco de dados conectado" : "Banco de dados sem conexão: confira as variáveis de ambiente"}
    </p>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 items-center px-4 py-16">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Em construção</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-balance">
          A gestão financeira de uma empresa, aplicada à sua vida.
        </h1>
        <p className="text-lg text-muted">
          Quanto sobrou no mês, o que ainda vai entrar e sair até o fim do ano e como está o seu patrimônio.
          Feito para profissionais liberais e autônomos.
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
