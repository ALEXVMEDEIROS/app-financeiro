import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Botao } from "@/components/ui/botao";
import { createClient } from "@/lib/supabase/server";
import { alternarPessoa } from "../../acoes";
import { ExcluirPessoa, FormPessoa } from "../../form-pessoa";

export const metadata: Metadata = { title: "Editar pessoa · Sobra Vida", robots: { index: false } };

async function Edicao({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const { data: pessoa } = await supabase
    .from("pessoas")
    .select("id, nome, tipo, documento, contato, ativa, logradouro, numero, complemento, bairro, cep, cidade, uf, descricao")
    .eq("id", id)
    .maybeSingle();

  // A proteção por usuário faz a pessoa de outro usuário simplesmente não aparecer.
  if (!pessoa) notFound();

  const { count } = await supabase
    .from("lancamentos")
    .select("id", { count: "exact", head: true })
    .eq("pessoa_id", pessoa.id);
  const alternar = alternarPessoa.bind(null, pessoa.id, !pessoa.ativa);

  return (
    <div className="flex flex-col gap-6">
      <p className="-mt-2 text-sm">
        <Link
          href={`/configuracoes/pessoas/${pessoa.id}`}
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          ← Voltar para {pessoa.nome}
        </Link>
      </p>
      {!pessoa.ativa && (
        <p className="rounded-lg bg-warn/10 px-3 py-2 text-sm" role="status">
          Esta pessoa está desativada: ela não aparece nas sugestões do lançamento.
        </p>
      )}
      <p className="text-sm text-muted">
        {count
          ? `Aparece em ${count} ${count === 1 ? "lançamento" : "lançamentos"}.`
          : "Ainda não aparece em nenhum lançamento."}
      </p>
      <FormPessoa inicial={pessoa} />
      <section className="flex flex-col gap-3 rounded-xl border border-line p-5">
        <h2 className="font-display text-lg font-bold">{pessoa.ativa ? "Desativar" : "Reativar"}</h2>
        <p className="text-sm text-muted">
          {pessoa.ativa
            ? "Use quando não houver mais negócios com ela. Os lançamentos antigos continuam com o nome."
            : "A pessoa volta a aparecer nas sugestões do lançamento."}
        </p>
        <form action={alternar}>
          <Botao type="submit" variante="secundario">
            {pessoa.ativa ? "Desativar pessoa" : "Reativar pessoa"}
          </Botao>
        </form>
      </section>
      {!count && <ExcluirPessoa id={pessoa.id} />}
    </div>
  );
}

export default function PaginaEditarPessoa({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Editar pessoa</h1>
      <Suspense fallback={<p className="text-muted">Carregando…</p>}>
        <Edicao params={params} />
      </Suspense>
    </div>
  );
}
