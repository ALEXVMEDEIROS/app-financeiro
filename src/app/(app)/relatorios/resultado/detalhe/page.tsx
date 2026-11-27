import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Valor } from "@/components/ui/valor";
import { formatarData, intervaloDoMes, nomeDoMes } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Detalhe do resultado · Sobra Vida", robots: { index: false } };

// Os lançamentos que formam um valor do Resultado do ano (sessão 12 da F3).
// Segue as mesmas regras da função resultado_mensal: caixa pela data do
// pagamento, previsto pelo vencimento; juros e multas vão para a linha própria.

type Parametros = Promise<{
  ano?: string;
  mes?: string;
  visao?: string;
  natureza?: string;
  grupo?: string;
  categoria?: string;
}>;

const ALVO = { despesa: "juros e multas por atraso", receita: "juros e multas recebidos" } as const;
const ROTULO_ALVO = { despesa: "Juros e multas por atraso", receita: "Juros e multas recebidos" } as const;
const GRUPO_SEM_ALVO = { despesa: "Despesas financeiras", receita: "Outras receitas" } as const;

const norm = (t: string) => t.trim().toLowerCase();

async function Detalhe({ searchParams }: { searchParams: Parametros }) {
  await connection();
  const p = await searchParams;
  const ano = Number(p.ano);
  const mes = Number(p.mes);
  const visao = p.visao === "previsto" ? "previsto" : "caixa";
  const natureza = p.natureza === "receita" ? "receita" : "despesa";
  const grupo = p.grupo ?? "";
  const categoria = p.categoria;
  const voltar = `/relatorios/resultado?ano=${ano}${visao === "previsto" ? "&visao=previsto" : ""}`;

  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12 || !grupo) {
    return <p className="text-muted">Endereço incompleto. Volte ao relatório e toque num valor.</p>;
  }

  const mesIso = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const { inicio, fim } = intervaloDoMes(mesIso);
  const campoData = visao === "caixa" ? "data_pagamento" : "data_vencimento";

  const supabase = await createClient();
  const [cats, grupos, lancs] = await Promise.all([
    supabase.from("categorias").select("id, nome, ativa, criado_em, grupo_id"),
    supabase.from("grupos").select("id, nome, natureza, ativo"),
    supabase
      .from("lancamentos")
      .select("id, valor, juros, multa, desconto, data_vencimento, data_pagamento, categoria_id, pessoa_id, observacao, parcela_num, parcela_total")
      .eq("tipo", natureza)
      .gte(campoData, inicio)
      .lte(campoData, fim)
      .order(campoData),
  ]);

  type Cat = { id: string; nome: string; grupo: string };
  const gruposPorId = new Map((grupos.data ?? []).map((g) => [g.id, g]));
  const listaCats: (Cat & { natureza: string; ativa: boolean; grupoAtivo: boolean; criado: string })[] = (cats.data ?? []).flatMap((c) => {
    const g = gruposPorId.get(c.grupo_id);
    return g ? [{ id: c.id, nome: c.nome, grupo: g.nome, natureza: g.natureza, ativa: c.ativa, grupoAtivo: g.ativo, criado: c.criado_em }] : [];
  });
  const porId = new Map(listaCats.map((c) => [c.id, c]));
  // Mesma escolha da função no banco: a categoria com o nome combinado, ativa primeiro.
  const alvo = listaCats
    .filter((c) => c.natureza === natureza && norm(c.nome) === ALVO[natureza])
    .sort((a, b) => Number(b.ativa) - Number(a.ativa) || Number(b.grupoAtivo) - Number(a.grupoAtivo) || a.criado.localeCompare(b.criado))[0];
  const alvoGrupo = alvo?.grupo ?? GRUPO_SEM_ALVO[natureza];
  const alvoCategoria = alvo?.nome ?? ROTULO_ALVO[natureza];

  const idsPessoas = [...new Set((lancs.data ?? []).map((l) => l.pessoa_id).filter((x): x is string => Boolean(x)))];
  const pessoas = idsPessoas.length ? (await supabase.from("pessoas").select("id, nome").in("id", idsPessoas)).data ?? [] : [];
  const nomePessoa = (id: string | null) => (id && pessoas.find((x) => x.id === id)?.nome) || "";

  type Parte = { chave: string; id: string; data: string; titulo: string; detalhe: string; valor: number };
  const partes: Parte[] = [];
  for (const l of lancs.data ?? []) {
    const pago = l.data_pagamento !== null;
    const cat = l.categoria_id ? porId.get(l.categoria_id) : undefined;
    const data = (visao === "caixa" ? l.data_pagamento : l.data_vencimento) as string;
    const parcela = l.parcela_num ? ` · ${l.parcela_num}/${l.parcela_total}` : "";
    const principal = pago ? Number(l.valor) - Number(l.desconto) : Number(l.valor);
    if (cat && cat.grupo === grupo && (!categoria || cat.nome === categoria) && principal !== 0) {
      partes.push({
        chave: `${l.id}-p`,
        id: l.id,
        data,
        titulo: cat.nome + parcela,
        detalhe: [nomePessoa(l.pessoa_id), l.observacao, pago && Number(l.desconto) > 0 ? `desconto de ${Number(l.desconto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""]
          .filter(Boolean)
          .join(" · "),
        valor: principal,
      });
    }
    const encargos = pago ? Number(l.juros) + Number(l.multa) : 0;
    if (encargos > 0 && alvoGrupo === grupo && (!categoria || alvoCategoria === categoria)) {
      partes.push({
        chave: `${l.id}-e`,
        id: l.id,
        data,
        titulo: `${alvoCategoria}`,
        detalhe: `de ${cat?.nome ?? "lançamento"}${parcela}, venceu em ${formatarData(l.data_vencimento)}`,
        valor: encargos,
      });
    }
  }
  const total = partes.reduce((s, x) => s + Math.round(x.valor * 100), 0) / 100;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted first-letter:uppercase">
          {nomeDoMes(mesIso)} · {visao === "caixa" ? "realizado (pela data do pagamento)" : "previsto (pelo vencimento)"}
        </p>
        <h2 className="font-display text-2xl font-bold">
          {categoria ?? grupo}
          {categoria && <span className="text-base font-normal text-muted"> · {grupo}</span>}
        </h2>
        <Valor valor={total} tipo={natureza} className="font-display text-3xl" />
      </div>
      {partes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-surface p-6 text-muted">Nenhum lançamento neste valor.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {partes.map((x) => (
            <li key={x.chave}>
              <Link
                href={`/lancamentos/${x.id}?voltar=${encodeURIComponent(`/relatorios/resultado/detalhe?ano=${ano}&mes=${mes}&visao=${visao}&natureza=${natureza}&grupo=${encodeURIComponent(grupo)}${categoria ? `&categoria=${encodeURIComponent(categoria)}` : ""}`)}`}
                className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-bg"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{x.titulo}</span>
                  <span className="block truncate text-sm text-muted">
                    {formatarData(x.data).slice(0, 5)}
                    {x.detalhe && ` · ${x.detalhe}`}
                  </span>
                </span>
                <Valor valor={x.valor} tipo={natureza} className="shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={voltar} className="inline-flex min-h-11 items-center font-semibold text-accent">
        ← Voltar ao resultado do ano
      </Link>
    </div>
  );
}

export default function PaginaDetalheResultado({ searchParams }: { searchParams: Parametros }) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Detalhe do resultado</h1>
      <Suspense fallback={<p className="text-muted">Carregando…</p>}>
        <Detalhe searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
