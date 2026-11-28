import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Ajuda } from "@/components/ui/ajuda";
import { Valor } from "@/components/ui/valor";
import { formatarData, hojeEmSaoPaulo, situacao, type Situacao } from "@/lib/datas";
import { valorEfetivo } from "@/lib/parcelas";
import { createClient } from "@/lib/supabase/server";
import { linhasDoEndereco, NOME_TIPO_PESSOA } from "../tipos";

export const metadata: Metadata = { title: "Pessoa · Sobra Vida", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ aviso?: string }> };

const AVISOS: Record<string, string> = {
  salvo: "Alterações salvas.",
  desativada: "Pessoa desativada: ela não aparece mais nas sugestões do lançamento.",
  reativada: "Pessoa reativada.",
};

const SELO: Record<Situacao, { texto: string; classe: string }> = {
  pago: { texto: "Pago", classe: "text-muted" },
  em_aberto: { texto: "Em aberto", classe: "bg-warn/15 text-fg" },
  atrasado: { texto: "Atrasado", classe: "bg-neg/15 text-neg" },
};

type Operacao = {
  id: string;
  tipo: "receita" | "despesa";
  efetivo: number;
  vencimento: string;
  pagamento: string | null;
  categoria: string;
  detalhe: string;
  parcela: string | null;
  situacao: Situacao;
};

/** Soma em centavos para não acumular erro de arredondamento. */
const somar = (ops: Operacao[]) => ops.reduce((s, o) => s + Math.round(o.efetivo * 100), 0) / 100;

function Cartao({ rotulo, valor, tipo }: { rotulo: string; valor: number; tipo: "receita" | "despesa" }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-3 sm:p-4">
      <p className="text-xs font-semibold text-muted sm:text-sm">{rotulo}</p>
      <Valor valor={valor} tipo={tipo} className="text-sm sm:text-lg" />
    </div>
  );
}

async function Ficha({ params, searchParams }: Props) {
  await connection();
  const { id } = await params;
  const { aviso } = await searchParams;
  const supabase = await createClient();
  const { data: pessoa } = await supabase
    .from("pessoas")
    .select("id, nome, tipo, documento, contato, ativa, logradouro, numero, complemento, bairro, cep, cidade, uf, descricao")
    .eq("id", id)
    .maybeSingle();

  // A proteção por usuário faz a pessoa de outro usuário simplesmente não aparecer.
  if (!pessoa) notFound();

  const [lancamentos, categorias, contas] = await Promise.all([
    supabase
      .from("lancamentos")
      .select(
        "id, tipo, valor, juros, multa, desconto, data_vencimento, data_pagamento, parcela_num, parcela_total, categoria_id, conta_id, observacao",
      )
      .eq("pessoa_id", pessoa.id)
      .order("data_vencimento", { ascending: false })
      .order("criado_em", { ascending: false })
      .limit(1000),
    supabase.from("categorias").select("id, nome"),
    supabase.from("contas_financeiras").select("id, instituicao, nome"),
  ]);

  const hoje = hojeEmSaoPaulo();
  const nomeCategoria = new Map((categorias.data ?? []).map((c) => [c.id, c.nome]));
  const nomeConta = new Map(
    (contas.data ?? []).map((c) => [c.id, c.instituicao ? `${c.instituicao} · ${c.nome}` : c.nome]),
  );

  // Transferências nunca têm pessoa; o filtro só garante o tipo.
  const operacoes: Operacao[] = (lancamentos.data ?? [])
    .filter((l) => l.tipo === "receita" || l.tipo === "despesa")
    .map((l) => ({
      id: l.id,
      tipo: l.tipo as Operacao["tipo"],
      efetivo: valorEfetivo(Number(l.valor), Number(l.juros), Number(l.multa), Number(l.desconto)),
      vencimento: l.data_vencimento,
      pagamento: l.data_pagamento,
      categoria: (l.categoria_id && nomeCategoria.get(l.categoria_id)) || "Sem categoria",
      detalhe: [nomeConta.get(l.conta_id), l.observacao].filter(Boolean).join(" · "),
      parcela: l.parcela_num && l.parcela_total ? `${l.parcela_num}/${l.parcela_total}` : null,
      situacao: situacao(l.data_vencimento, l.data_pagamento, hoje),
    }));

  const despesas = operacoes.filter((o) => o.tipo === "despesa");
  const receitas = operacoes.filter((o) => o.tipo === "receita");
  const pago = somar(despesas.filter((o) => o.situacao === "pago"));
  const aPagar = somar(despesas.filter((o) => o.situacao !== "pago"));
  const recebido = somar(receitas.filter((o) => o.situacao === "pago"));
  const aReceber = somar(receitas.filter((o) => o.situacao !== "pago"));

  const anos = new Map<string, Operacao[]>();
  for (const o of operacoes) {
    const ano = o.vencimento.slice(0, 4);
    anos.set(ano, [...(anos.get(ano) ?? []), o]);
  }

  const voltar = `/configuracoes/pessoas/${pessoa.id}`;
  const detalhePessoa = [NOME_TIPO_PESSOA[pessoa.tipo] ?? pessoa.tipo, pessoa.documento, pessoa.contato]
    .filter(Boolean)
    .join(" · ");
  const textoAviso = aviso ? AVISOS[aviso] : undefined;
  const endereco = linhasDoEndereco(pessoa);

  return (
    <div className="flex flex-col gap-4">
      {textoAviso && (
        <p className="rounded-lg bg-pos/10 px-4 py-3 font-semibold text-pos" role="status">
          {textoAviso}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">{pessoa.nome}</h1>
          <p className="text-sm text-muted">{detalhePessoa}</p>
          {endereco.map((linha) => (
            <p key={linha} className="text-sm text-muted">{linha}</p>
          ))}
          {!pessoa.ativa && <p className="text-sm text-warn">Desativada</p>}
        </div>
        <Link
          href={`/configuracoes/pessoas/${pessoa.id}/editar`}
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 font-semibold hover:border-muted"
        >
          Editar dados
        </Link>
      </div>

      {pessoa.descricao && (
        <section aria-label="Descrição" className="rounded-xl border border-line bg-surface p-4">
          <p className="whitespace-pre-line break-words text-sm">{pessoa.descricao}</p>
        </section>
      )}

      {lancamentos.error ? (
        <p className="rounded-lg bg-neg/10 px-3 py-2 text-neg" role="alert">
          Não foi possível carregar as operações agora. Atualize a página em alguns instantes.
        </p>
      ) : operacoes.length === 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line bg-surface p-6">
          <p className="font-semibold">Nenhuma operação com {pessoa.nome} ainda</p>
          <p className="text-muted">
            Ao lançar uma despesa ou receita, escolha esta pessoa em &quot;Pago a&quot; ou
            &quot;Recebido de&quot; e o lançamento aparece aqui.
          </p>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-1" aria-label="Totais com esta pessoa">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {despesas.length > 0 && <Cartao rotulo="Total pago" valor={pago} tipo="despesa" />}
              {despesas.length > 0 && <Cartao rotulo="A pagar" valor={aPagar} tipo="despesa" />}
              {receitas.length > 0 && <Cartao rotulo="Total recebido" valor={recebido} tipo="receita" />}
              {receitas.length > 0 && <Cartao rotulo="A receber" valor={aReceber} tipo="receita" />}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted">
              {operacoes.length} {operacoes.length === 1 ? "operação" : "operações"} com esta pessoa
              <Ajuda titulo="Totais da pessoa">
                Somam todos os lançamentos em que esta pessoa aparece em &quot;Pago a&quot; ou
                &quot;Recebido de&quot;, de todos os meses, já com juros, multa e desconto. &quot;A
                pagar&quot; e &quot;A receber&quot; incluem os atrasados e as parcelas futuras.
              </Ajuda>
            </p>
          </section>

          {[...anos.entries()].map(([ano, doAno]) => (
            <section key={ano} aria-label={`Operações de ${ano}`} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted">{ano}</h2>
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {doAno.map((o) => {
                  const selo = SELO[o.situacao];
                  return (
                    <li key={o.id}>
                      <Link
                        href={`/lancamentos/${o.id}?voltar=${encodeURIComponent(voltar)}`}
                        className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-bg focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold" title={o.categoria}>
                            {o.categoria}
                            {o.parcela && <span className="font-normal text-muted"> · {o.parcela}</span>}
                          </p>
                          {o.detalhe && (
                            <p className="truncate text-sm text-muted" title={o.detalhe}>{o.detalhe}</p>
                          )}
                          <p className="text-xs text-muted">
                            {o.tipo === "despesa" ? "Despesa" : "Receita"} · vence {formatarData(o.vencimento)}
                            {o.pagamento && ` · pago em ${formatarData(o.pagamento)}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Valor valor={o.efetivo} tipo={o.tipo} />
                          <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${selo.classe}`}>
                            {selo.texto}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

export default function PaginaPessoa(props: Props) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="text-sm">
        <Link href="/configuracoes/pessoas" className="font-semibold text-accent underline-offset-4 hover:underline">
          ← Pessoas
        </Link>
      </p>
      <Suspense fallback={<p className="text-muted">Carregando…</p>}>
        <Ficha {...props} />
      </Suspense>
    </div>
  );
}
