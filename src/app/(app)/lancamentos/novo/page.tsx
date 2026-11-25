import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";
import { FormLancamento, type CategoriaOpcao } from "./form-lancamento";

export const metadata: Metadata = { title: "Novo lançamento · Sobra Vida", robots: { index: false } };

async function Conteudo() {
  await connection();
  const supabase = await createClient();
  const [contas, grupos, categorias, centros, formas] = await Promise.all([
    supabase.from("contas_financeiras").select("id, instituicao, nome").eq("ativa", true),
    supabase.from("grupos").select("id, nome, natureza, ordem").eq("ativo", true),
    supabase.from("categorias").select("id, nome, grupo_id").eq("ativa", true),
    supabase.from("centros_custo").select("id, nome").eq("ativo", true),
    supabase.from("formas_pagamento").select("id, nome").eq("ativa", true),
  ]);

  const listaContas = (contas.data ?? [])
    .map((c) => ({ id: c.id, rotulo: c.instituicao ? `${c.instituicao} · ${c.nome}` : c.nome }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  if (listaContas.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line bg-surface p-6">
        <p className="font-display text-xl font-bold">Cadastre uma conta primeiro</p>
        <p className="text-muted">Todo lançamento sai de uma conta ou entra numa conta, como o seu banco ou a carteira.</p>
        <Link href="/contas/nova" className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 font-semibold text-bg">
          Cadastrar conta
        </Link>
      </div>
    );
  }

  const gruposPorId = new Map((grupos.data ?? []).map((g) => [g.id, g]));
  const listaCategorias: CategoriaOpcao[] = (categorias.data ?? [])
    .flatMap((c) => {
      const g = gruposPorId.get(c.grupo_id);
      return g ? [{ id: c.id, nome: c.nome, grupo: g.nome, natureza: g.natureza as "receita" | "despesa", ordem: g.ordem }] : [];
    })
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <FormLancamento
      hoje={hojeEmSaoPaulo()}
      contas={listaContas}
      categorias={listaCategorias}
      centros={(centros.data ?? []).map((c) => ({ id: c.id, rotulo: c.nome }))}
      formas={(formas.data ?? []).map((f) => ({ id: f.id, rotulo: f.nome }))}
    />
  );
}

export default function PaginaNovoLancamento() {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Novo lançamento</h1>
      <Suspense fallback={<p className="text-muted">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}
