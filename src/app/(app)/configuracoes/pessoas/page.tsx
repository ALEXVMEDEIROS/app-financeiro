import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NOME_TIPO_PESSOA } from "./tipos";

export const metadata: Metadata = { title: "Pessoas · Sobra Vida", robots: { index: false } };

type Pessoa = {
  id: string;
  nome: string;
  tipo: string;
  documento: string | null;
  contato: string | null;
  ativa: boolean;
};

const FILTROS = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "fornecedor", rotulo: "Fornecedores" },
  { valor: "cliente", rotulo: "Clientes" },
];

function CartaoPessoa({ p }: { p: Pessoa }) {
  const detalhe = [p.documento, p.contato].filter(Boolean).join(" · ");
  return (
    <li>
      <Link
        href={`/configuracoes/pessoas/${p.id}`}
        className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 hover:border-muted focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className="min-w-0">
          <span className="block truncate font-semibold">{p.nome}</span>
          {detalhe && <span className="block truncate text-xs text-muted">{detalhe}</span>}
        </span>
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted">
          {NOME_TIPO_PESSOA[p.tipo] ?? p.tipo}
        </span>
      </Link>
    </li>
  );
}

async function Lista({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  await connection();
  const { tipo } = await searchParams;
  const filtro = tipo === "cliente" || tipo === "fornecedor" ? tipo : "todas";
  const supabase = await createClient();
  let consulta = supabase.from("pessoas").select("id, nome, tipo, documento, contato, ativa").order("nome");
  if (filtro !== "todas") consulta = consulta.in("tipo", [filtro, "ambos"]);
  const { data, error } = await consulta;

  if (error) {
    return (
      <p className="rounded-lg bg-neg/10 px-3 py-2 text-neg" role="alert">
        Não foi possível carregar as pessoas agora. Atualize a página em alguns instantes.
      </p>
    );
  }

  const pessoas = (data ?? []) as Pessoa[];
  const ativas = pessoas.filter((p) => p.ativa);
  const desativadas = pessoas.filter((p) => !p.ativa);

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-1 rounded-lg bg-surface p-1" aria-label="Filtrar pessoas">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={f.valor === "todas" ? "/configuracoes/pessoas" : `/configuracoes/pessoas?tipo=${f.valor}`}
            aria-current={filtro === f.valor ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-md text-sm font-semibold ${
              filtro === f.valor ? "bg-fg text-bg" : "text-muted"
            }`}
          >
            {f.rotulo}
          </Link>
        ))}
      </nav>

      {ativas.length === 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line bg-surface p-6">
          <p className="font-semibold">
            Nenhuma pessoa {filtro === "todas" ? "cadastrada" : "nesta lista"} ainda
          </p>
          <p className="text-muted">
            Ao lançar uma despesa ou receita, digite o nome em &quot;Pago a&quot; ou &quot;Recebido
            de&quot; e a pessoa aparece aqui. Ou cadastre agora em &quot;+ Nova pessoa&quot;.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {ativas.map((p) => (
            <CartaoPessoa key={p.id} p={p} />
          ))}
        </ul>
      )}

      {desativadas.length > 0 && (
        <details className="rounded-xl border border-line p-4">
          <summary className="cursor-pointer font-semibold text-muted">
            Pessoas desativadas ({desativadas.length})
          </summary>
          <ul className="mt-3 grid gap-3 opacity-70 sm:grid-cols-2">
            {desativadas.map((p) => (
              <CartaoPessoa key={p.id} p={p} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function PaginaPessoas({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="text-sm">
        <Link href="/configuracoes" className="font-semibold text-accent underline-offset-4 hover:underline">
          ← Configurações
        </Link>
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Pessoas</h1>
        <Link
          href="/configuracoes/pessoas/nova"
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 font-semibold hover:border-muted"
        >
          + Nova pessoa
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted">Carregando pessoas…</p>}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
