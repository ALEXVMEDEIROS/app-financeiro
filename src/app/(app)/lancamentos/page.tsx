import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Ajuda } from "@/components/ui/ajuda";
import { Valor } from "@/components/ui/valor";
import {
  diaDaSemana,
  formatarData,
  hojeEmSaoPaulo,
  intervaloDoMes,
  mesDoParametro,
  nomeDoMes,
  situacao,
  somarMeses,
  type Situacao,
} from "@/lib/datas";
import { valorEfetivo } from "@/lib/parcelas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lançamentos · Sobra Vida", robots: { index: false } };

type Parametros = Promise<{ mes?: string }>;

type Linha = {
  id: string;
  tipo: "receita" | "despesa" | "transferencia";
  efetivo: number;
  vencimento: string;
  pagamento: string | null;
  titulo: string;
  detalhe: string;
  parcela: string | null;
  situacao: Situacao;
};

const SELO: Record<Situacao, { texto: string; classe: string }> = {
  pago: { texto: "Pago", classe: "text-muted" },
  em_aberto: { texto: "Em aberto", classe: "bg-warn/15 text-fg" },
  atrasado: { texto: "Atrasado", classe: "bg-neg/15 text-neg" },
};

/** "2026-11-01" → "2026-11", para o endereço. */
const mesNoEndereco = (iso: string) => iso.slice(0, 7);

function NavegacaoDoMes({ mes, mesDeHoje }: { mes: string; mesDeHoje: string }) {
  const anterior = mesNoEndereco(somarMeses(mes, -1));
  const seguinte = mesNoEndereco(somarMeses(mes, 1));
  const botao =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-surface px-3 font-semibold hover:border-muted";
  return (
    <nav className="flex items-center gap-2" aria-label="Mudar de mês">
      <Link href={`/lancamentos?mes=${anterior}`} className={botao} aria-label="Mês anterior">
        ‹
      </Link>
      <p className="min-w-0 flex-1 text-center font-display text-xl font-bold first-letter:uppercase">
        {nomeDoMes(mes)}
      </p>
      <Link href={`/lancamentos?mes=${seguinte}`} className={botao} aria-label="Mês seguinte">
        ›
      </Link>
      {mes !== mesDeHoje && (
        <Link href="/lancamentos" className={`${botao} text-sm`}>
          Hoje
        </Link>
      )}
    </nav>
  );
}

function Totais({ linhas }: { linhas: Linha[] }) {
  const soma = (tipo: Linha["tipo"]) =>
    linhas.filter((l) => l.tipo === tipo).reduce((s, l) => s + Math.round(l.efetivo * 100), 0) / 100;
  const receitas = soma("receita");
  const despesas = soma("despesa");
  const resultado = Math.round((receitas - despesas) * 100) / 100;
  const cartao = "flex flex-col gap-1 rounded-xl border border-line bg-surface p-3 sm:p-4";
  return (
    <section className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Totais do mês">
      <div className={cartao}>
        <p className="text-xs font-semibold text-muted sm:text-sm">Receitas</p>
        <Valor valor={receitas} tipo="receita" className="text-sm sm:text-lg" />
      </div>
      <div className={cartao}>
        <p className="text-xs font-semibold text-muted sm:text-sm">Despesas</p>
        <Valor valor={despesas} tipo="despesa" className="text-sm sm:text-lg" />
      </div>
      <div className={cartao}>
        <p className="flex items-center gap-1 text-xs font-semibold text-muted sm:text-sm">
          Resultado
          <Ajuda titulo="Resultado do mês">
            Receitas menos despesas do mês, pagas ou em aberto, pela data de vencimento.
            Transferências entre suas contas não entram.
          </Ajuda>
        </p>
        <Valor valor={resultado} className="text-sm sm:text-lg" />
      </div>
    </section>
  );
}

function ItemLancamento({ l }: { l: Linha }) {
  const selo = SELO[l.situacao];
  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-semibold" title={l.titulo}>
          {l.titulo}
          {l.parcela && <span className="font-normal text-muted"> · {l.parcela}</span>}
        </p>
        <p className="truncate text-sm text-muted" title={l.detalhe}>{l.detalhe}</p>
        {l.pagamento && l.pagamento !== l.vencimento && (
          <p className="text-xs text-muted">Pago em {formatarData(l.pagamento)}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Valor valor={l.efetivo} tipo={l.tipo} />
        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${selo.classe}`}>{selo.texto}</span>
      </div>
    </li>
  );
}

async function ListaDoMes({ searchParams }: { searchParams: Parametros }) {
  await connection();
  const hoje = hojeEmSaoPaulo();
  const { mes: textoMes } = await searchParams;
  const mes = mesDoParametro(textoMes, hoje);
  const mesDeHoje = mesDoParametro(undefined, hoje);
  const { inicio, fim } = intervaloDoMes(mes);

  const supabase = await createClient();
  const [lancamentos, categorias, contas, pessoas] = await Promise.all([
    supabase
      .from("lancamentos")
      .select(
        "id, tipo, valor, juros, multa, desconto, data_vencimento, data_pagamento, parcela_num, parcela_total, categoria_id, conta_id, conta_destino_id, pessoa_id, observacao",
      )
      .gte("data_vencimento", inicio)
      .lte("data_vencimento", fim)
      .order("data_vencimento", { ascending: false })
      .order("criado_em", { ascending: false }),
    supabase.from("categorias").select("id, nome"),
    supabase.from("contas_financeiras").select("id, instituicao, nome"),
    supabase.from("pessoas").select("id, nome"),
  ]);

  if (lancamentos.error) {
    return (
      <>
        <NavegacaoDoMes mes={mes} mesDeHoje={mesDeHoje} />
        <p className="rounded-lg bg-neg/10 px-3 py-2 text-neg" role="alert">
          Não foi possível carregar os lançamentos agora. Atualize a página em alguns instantes.
        </p>
      </>
    );
  }

  const nomeCategoria = new Map((categorias.data ?? []).map((c) => [c.id, c.nome]));
  const nomeConta = new Map(
    (contas.data ?? []).map((c) => [c.id, c.instituicao ? `${c.instituicao} · ${c.nome}` : c.nome]),
  );
  const nomePessoa = new Map((pessoas.data ?? []).map((p) => [p.id, p.nome]));

  const linhas: Linha[] = (lancamentos.data ?? []).map((l) => {
    const tipo = l.tipo as Linha["tipo"];
    const conta = nomeConta.get(l.conta_id) ?? "Conta";
    const pessoa = l.pessoa_id ? nomePessoa.get(l.pessoa_id) : undefined;
    const titulo =
      tipo === "transferencia"
        ? "Transferência"
        : (l.categoria_id && nomeCategoria.get(l.categoria_id)) || "Sem categoria";
    const detalhe =
      tipo === "transferencia"
        ? `${conta} → ${(l.conta_destino_id && nomeConta.get(l.conta_destino_id)) || "Conta"}`
        : [pessoa, conta, l.observacao].filter(Boolean).join(" · ");
    return {
      id: l.id,
      tipo,
      efetivo: valorEfetivo(Number(l.valor), Number(l.juros), Number(l.multa), Number(l.desconto)),
      vencimento: l.data_vencimento,
      pagamento: l.data_pagamento,
      titulo,
      detalhe,
      parcela: l.parcela_num && l.parcela_total ? `${l.parcela_num}/${l.parcela_total}` : null,
      situacao: situacao(l.data_vencimento, l.data_pagamento, hoje),
    };
  });

  const dias = new Map<string, Linha[]>();
  for (const l of linhas) dias.set(l.vencimento, [...(dias.get(l.vencimento) ?? []), l]);

  return (
    <>
      <NavegacaoDoMes mes={mes} mesDeHoje={mesDeHoje} />
      <Totais linhas={linhas} />
      {linhas.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line bg-surface p-6">
          <p className="font-semibold">Nenhum lançamento neste mês</p>
          <p className="text-muted">
            Use o botão &quot;+&quot; para lançar uma despesa, receita ou transferência.
          </p>
          <Link
            href="/lancamentos/novo"
            className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 font-semibold text-bg"
          >
            Novo lançamento
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {[...dias.entries()].map(([dia, doDia]) => (
            <section key={dia} aria-label={formatarData(dia)} className="flex flex-col gap-2">
              <h2 className="flex items-baseline gap-2 text-sm font-semibold text-muted">
                <span className="text-fg">{formatarData(dia).slice(0, 5)}</span>
                <span>{diaDaSemana(dia)}</span>
                {dia === hoje && (
                  <span className="rounded bg-accent px-1.5 text-xs text-bg">hoje</span>
                )}
              </h2>
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {doDia.map((l) => (
                  <ItemLancamento key={l.id} l={l} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

export default function PaginaLancamentos({ searchParams }: { searchParams: Parametros }) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Lançamentos</h1>
        <Link
          href="/lancamentos/novo"
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 font-semibold hover:border-muted"
        >
          + Novo
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted">Carregando lançamentos…</p>}>
        <ListaDoMes searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
