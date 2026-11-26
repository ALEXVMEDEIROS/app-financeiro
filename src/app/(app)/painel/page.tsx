import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Painel · Sobra Vida",
  robots: { index: false, follow: false },
};

// Painel provisório: primeiros passos. O painel de verdade (resultado do mês) vem na F3.
async function BoasVindas() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const usuarioId = data?.claims?.sub;
  if (!usuarioId) redirect("/entrar?proxima=/painel");

  const [{ data: perfil }, { count: contas }, { count: lancamentos }] = await Promise.all([
    supabase.from("perfis").select("nome").eq("id", usuarioId).single(),
    supabase.from("contas_financeiras").select("id", { count: "exact", head: true }).eq("ativa", true),
    supabase.from("lancamentos").select("id", { count: "exact", head: true }),
  ]);

  const primeiroNome = (perfil?.nome ?? "").split(" ")[0] || "por aqui";
  const passos = [
    { feito: (contas ?? 0) > 0, texto: "Cadastre suas contas com o saldo de hoje", href: "/contas/nova" },
    { feito: (lancamentos ?? 0) > 0, texto: "Lance suas receitas e despesas", href: "/lancamentos/novo" },
    { feito: false, texto: "Ajuste o plano de contas ao seu jeito", href: "/configuracoes/plano-de-contas" },
  ];

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Olá, {primeiroNome}!</h1>
      {(contas ?? 0) === 0 ? (
        <p className="text-lg text-muted">Para começar, cadastre a primeira conta: o banco, a carteira ou o caixa.</p>
      ) : (
        <p className="text-lg text-muted">
          {contas} {contas === 1 ? "conta ativa" : "contas ativas"} e {lancamentos ?? 0}{" "}
          {lancamentos === 1 ? "lançamento" : "lançamentos"} até agora.
        </p>
      )}
      <ol className="flex flex-col gap-2">
        {passos.map((p, i) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface p-4 hover:border-muted"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  p.feito ? "bg-pos text-bg" : "bg-bg text-muted"
                }`}
                aria-hidden
              >
                {p.feito ? "✓" : i + 1}
              </span>
              <span className={`font-semibold ${p.feito ? "text-muted line-through" : ""}`}>{p.texto}</span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted">
        Esta é uma versão de testes. O painel com resultado do mês e gráficos chega na próxima etapa.
      </p>
    </div>
  );
}

export default function PaginaPainel() {
  return (
    <Suspense fallback={<p className="text-muted">Carregando…</p>}>
      <BoasVindas />
    </Suspense>
  );
}
