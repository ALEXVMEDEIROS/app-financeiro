import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";
import { FormLancamento, type CategoriaOpcao, type Modelo, type Sugestoes, type Tipo } from "./form-lancamento";

export const metadata: Metadata = { title: "Novo lançamento · Sobra Vida", robots: { index: false } };

type Parametros = Promise<{ salvo?: string; tipo?: string; n?: string; parcelas?: string; duplicar?: string }>;
const TIPOS: Tipo[] = ["despesa", "receita", "transferencia"];
const NOME_SALVO: Record<Tipo, string> = {
  despesa: "Despesa salva.",
  receita: "Receita salva.",
  transferencia: "Transferência salva.",
};

async function Conteudo({ searchParams }: { searchParams: Parametros }) {
  await connection();
  const params = await searchParams;
  let tipoInicial = TIPOS.includes(params.tipo as Tipo) ? (params.tipo as Tipo) : "despesa";
  const salvo = TIPOS.includes(params.salvo as Tipo) ? (params.salvo as Tipo) : null;

  const supabase = await createClient();
  const ultimo = (tipo: Tipo) =>
    supabase
      .from("lancamentos")
      .select("categoria_id, conta_id, conta_destino_id")
      .eq("tipo", tipo)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

  const [contas, grupos, categorias, centros, formas, pessoas, ultDespesa, ultReceita, ultTransf] = await Promise.all([
    supabase.from("contas_financeiras").select("id, instituicao, nome").eq("ativa", true),
    supabase.from("grupos").select("id, nome, natureza, ordem").eq("ativo", true),
    supabase.from("categorias").select("id, nome, grupo_id").eq("ativa", true),
    supabase.from("centros_custo").select("id, nome").eq("ativo", true),
    supabase.from("formas_pagamento").select("id, nome").eq("ativa", true),
    supabase.from("pessoas").select("nome").eq("ativa", true).order("nome").limit(500),
    ultimo("despesa"),
    ultimo("receita"),
    ultimo("transferencia"),
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

  // Só sugere o que ainda está ativo (conta ou categoria desativada não volta).
  const contasAtivas = new Set(listaContas.map((c) => c.id));
  const categoriasAtivas = new Set(listaCategorias.map((c) => c.id));
  const sugerir = (l: { categoria_id: string | null; conta_id: string; conta_destino_id: string | null } | null) =>
    l
      ? {
          categoria: l.categoria_id && categoriasAtivas.has(l.categoria_id) ? l.categoria_id : undefined,
          conta: contasAtivas.has(l.conta_id) ? l.conta_id : undefined,
          destino: l.conta_destino_id && contasAtivas.has(l.conta_destino_id) ? l.conta_destino_id : undefined,
        }
      : undefined;
  // "Duplicar": parte de um lançamento existente (só o que ainda está ativo).
  let modelo: Modelo | undefined;
  if (params.duplicar && /^[0-9a-f-]{36}$/i.test(params.duplicar)) {
    const { data: o } = await supabase
      .from("lancamentos")
      .select("tipo, valor, categoria_id, conta_id, conta_destino_id, centro_custo_id, forma_pagamento_id, pessoa_id, observacao")
      .eq("id", params.duplicar)
      .maybeSingle();
    if (o) {
      const pessoa = o.pessoa_id
        ? (await supabase.from("pessoas").select("nome").eq("id", o.pessoa_id).maybeSingle()).data?.nome
        : undefined;
      tipoInicial = o.tipo as Tipo;
      modelo = {
        valor: Number(o.valor),
        categoria: o.categoria_id && categoriasAtivas.has(o.categoria_id) ? o.categoria_id : undefined,
        conta: contasAtivas.has(o.conta_id) ? o.conta_id : "",
        destino: o.conta_destino_id && contasAtivas.has(o.conta_destino_id) ? o.conta_destino_id : undefined,
        centro: o.centro_custo_id ?? undefined,
        forma: o.forma_pagamento_id ?? undefined,
        pessoa,
        observacao: o.observacao ?? undefined,
      };
    }
  }

  const sugestoes: Sugestoes = {
    despesa: sugerir(ultDespesa.data),
    receita: sugerir(ultReceita.data),
    transferencia: sugerir(ultTransf.data),
  };

  return (
    <>
      {modelo && (
        <p className="rounded-lg bg-accent/10 px-4 py-3 text-sm font-semibold" role="status">
          Cópia de um lançamento: confira a data e o valor e salve. O original não muda.
        </p>
      )}
      {salvo && (
        <p className="rounded-lg bg-pos/10 px-4 py-3 font-semibold text-pos" role="status">
          {NOME_SALVO[salvo]}
          {Number(params.parcelas) > 1 && ` Foram criadas ${Number(params.parcelas)} parcelas.`} Pode lançar o próximo.
        </p>
      )}
      <FormLancamento
        key={params.n ?? params.duplicar ?? "novo"}
        hoje={hojeEmSaoPaulo()}
        tipoInicial={tipoInicial}
        contas={listaContas}
        categorias={listaCategorias}
        centros={(centros.data ?? []).map((c) => ({ id: c.id, rotulo: c.nome }))}
        formas={(formas.data ?? []).map((f) => ({ id: f.id, rotulo: f.nome }))}
        pessoas={[...new Set((pessoas.data ?? []).map((p) => p.nome))]}
        sugestoes={sugestoes}
        modelo={modelo}
      />
    </>
  );
}

export default function PaginaNovoLancamento({ searchParams }: { searchParams: Parametros }) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Novo lançamento</h1>
      <Suspense fallback={<p className="text-muted">Carregando…</p>}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
