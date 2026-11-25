import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Ajuda } from "@/components/ui/ajuda";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Plano de contas · Sobra Vida", robots: { index: false } };

type Natureza = "despesa" | "receita";
type Parametros = Promise<{ natureza?: string }>;

const ABAS: { valor: Natureza; rotulo: string }[] = [
  { valor: "despesa", rotulo: "Despesas" },
  { valor: "receita", rotulo: "Receitas" },
];

async function Plano({ searchParams }: { searchParams: Parametros }) {
  await connection();
  const { natureza: texto } = await searchParams;
  const natureza: Natureza = texto === "receita" ? "receita" : "despesa";

  const supabase = await createClient();
  const [grupos, categorias, usos] = await Promise.all([
    supabase.from("grupos").select("id, nome, natureza, ordem, ativo").order("ordem").order("nome"),
    supabase.from("categorias").select("id, nome, grupo_id, ativa").order("nome"),
    // Só a coluna da categoria, para contar quantos lançamentos cada uma tem.
    supabase.from("lancamentos").select("categoria_id").not("categoria_id", "is", null).limit(20000),
  ]);

  if (grupos.error || categorias.error) {
    return (
      <p className="rounded-lg bg-neg/10 px-3 py-2 text-neg" role="alert">
        Não foi possível carregar o plano de contas agora. Atualize a página em alguns instantes.
      </p>
    );
  }

  const usosPorCategoria = new Map<string, number>();
  for (const u of usos.data ?? []) {
    if (u.categoria_id) usosPorCategoria.set(u.categoria_id, (usosPorCategoria.get(u.categoria_id) ?? 0) + 1);
  }

  const gruposDaAba = (grupos.data ?? []).filter((g) => g.natureza === natureza);
  const categoriasPorGrupo = new Map<string, typeof categorias.data>();
  for (const c of categorias.data ?? []) {
    categoriasPorGrupo.set(c.grupo_id, [...(categoriasPorGrupo.get(c.grupo_id) ?? []), c]);
  }
  const totalCategorias = gruposDaAba.reduce((s, g) => s + (categoriasPorGrupo.get(g.id)?.length ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-1 rounded-lg bg-surface p-1" aria-label="Natureza">
        {ABAS.map((a) => (
          <Link
            key={a.valor}
            href={`/configuracoes/plano-de-contas?natureza=${a.valor}`}
            aria-current={natureza === a.valor ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-md text-sm font-semibold ${
              natureza === a.valor ? (a.valor === "despesa" ? "bg-neg text-bg" : "bg-pos text-bg") : "text-muted"
            }`}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>

      <p className="text-sm text-muted">
        {gruposDaAba.length} {gruposDaAba.length === 1 ? "grupo" : "grupos"} · {totalCategorias}{" "}
        {totalCategorias === 1 ? "categoria" : "categorias"} de {natureza}
      </p>

      {gruposDaAba.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-surface p-6 text-muted">
          Nenhum grupo de {natureza} ainda.
        </p>
      ) : (
        gruposDaAba.map((g) => {
          const lista = categoriasPorGrupo.get(g.id) ?? [];
          const ativas = lista.filter((c) => c.ativa);
          const inativas = lista.filter((c) => !c.ativa);
          return (
            <section key={g.id} className="flex flex-col gap-2" aria-label={g.nome}>
              <h2 className="flex items-baseline justify-between gap-3 border-b border-line pb-1">
                <span className={`font-display text-lg font-bold ${g.ativo ? "" : "text-muted line-through"}`}>
                  {g.nome}
                </span>
                <span className="text-xs font-semibold text-muted">
                  {g.ativo ? `${ativas.length} ${ativas.length === 1 ? "categoria" : "categorias"}` : "Grupo desativado"}
                </span>
              </h2>
              {lista.length === 0 ? (
                <p className="text-sm text-muted">Sem categorias neste grupo.</p>
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                  {[...ativas, ...inativas].map((c) => {
                    const n = usosPorCategoria.get(c.id) ?? 0;
                    return (
                      <li key={c.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${c.ativa ? "" : "opacity-60"}`}>
                        <span className="min-w-0 truncate font-semibold">
                          {c.nome}
                          {!c.ativa && <span className="ml-2 text-xs font-normal text-muted">desativada</span>}
                        </span>
                        <span className="shrink-0 text-xs text-muted tabular-nums">
                          {n === 0 ? "sem uso" : `${n} ${n === 1 ? "lançamento" : "lançamentos"}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

export default function PaginaPlanoDeContas({ searchParams }: { searchParams: Parametros }) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="text-sm">
        <Link href="/configuracoes" className="font-semibold text-accent underline-offset-4 hover:underline">
          ← Configurações
        </Link>
      </p>
      <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
        Plano de contas
        <Ajuda titulo="Plano de contas">
          É a forma como o Sobra Vida organiza suas receitas e despesas: cada categoria (como
          Mercado) fica dentro de um grupo (como Alimentação). Os relatórios somam por grupo e por
          categoria.
        </Ajuda>
      </h1>
      <Suspense fallback={<p className="text-muted">Carregando plano de contas…</p>}>
        <Plano searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
