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
import { combinaBusca, enderecoComFiltros, lerFiltros, temFiltro, type Filtros } from "@/lib/filtros";
import { valorEfetivo } from "@/lib/parcelas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lançamentos · Sobra Vida", robots: { index: false } };

type Parametros = Promise<{ mes?: string; tipo?: string; aberto?: string; busca?: string; aviso?: string }>;

const AVISOS: Record<string, string> = {
  quitado: "Pagamento registrado. Os saldos já estão atualizados.",
  desfeito: "Pagamento desfeito: o lançamento voltou a ficar em aberto.",
};

type Linha = {
  id: string;
  tipo: "receita" | "despesa" | "transferencia";
  efetivo: number;
  vencimento: string;
  pagamento: string | null;
  titulo: string;
  detalhe: string;
  /** Textos onde a busca procura: categoria, pessoa, contas e observação. */
  busca: string[];
  parcela: string | null;
  situacao: Situacao;
};

const SELO: Record<Situacao, { texto: string; classe: string }> = {
  pago: { texto: "Pago", classe: "text-muted" },
  em_aberto: { texto: "Em aberto", classe: "bg-warn/15 text-fg" },
  atrasado: { texto: "Atrasado", classe: "bg-neg/15 text-neg" },
};

const COLUNAS =
  "id, tipo, valor, juros, multa, desconto, data_vencimento, data_pagamento, parcela_num, parcela_total, categoria_id, conta_id, conta_destino_id, pessoa_id, observacao";

/** "2026-11-01" → "2026-11", para o endereço. */
const mesNoEndereco = (iso: string) => iso.slice(0, 7);

const somaDe = (linhas: Linha[], tipo?: Linha["tipo"]) =>
  linhas.filter((l) => !tipo || l.tipo === tipo).reduce((s, l) => s + Math.round(l.efetivo * 100), 0) / 100;

const estiloBotao =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-surface px-3 font-semibold hover:border-muted";

function NavegacaoDoMes({ mes, mesDeHoje, filtros }: { mes: string; mesDeHoje: string; filtros: Filtros }) {
  // Trocar de mês mantém os filtros escolhidos.
  const para = (m: string) => `/lancamentos${enderecoComFiltros(mesNoEndereco(m), filtros)}`;
  return (
    <nav className="flex items-center gap-2" aria-label="Mudar de mês">
      <Link href={para(somarMeses(mes, -1))} className={estiloBotao} aria-label="Mês anterior">
        ‹
      </Link>
      <p className="min-w-0 flex-1 text-center font-display text-xl font-bold first-letter:uppercase">
        {nomeDoMes(mes)}
      </p>
      <Link href={para(somarMeses(mes, 1))} className={estiloBotao} aria-label="Mês seguinte">
        ›
      </Link>
      {mes !== mesDeHoje && (
        <Link href={`/lancamentos${enderecoComFiltros(undefined, filtros)}`} className={`${estiloBotao} text-sm`}>
          Hoje
        </Link>
      )}
    </nav>
  );
}

/** Formulário simples (GET): funciona sem JavaScript e o filtro fica no endereço. */
function BarraDeFiltros({ mes, filtros }: { mes: string; filtros: Filtros }) {
  const campo =
    "min-h-11 rounded-lg border border-line bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-accent";
  return (
    <details open={temFiltro(filtros) || undefined} className="rounded-xl border border-line bg-surface p-3">
      <summary className="cursor-pointer text-sm font-semibold text-accent">
        Filtrar e buscar
        {temFiltro(filtros) && <span className="font-normal text-muted"> · filtro ativo</span>}
      </summary>
      <form action="/lancamentos" className="mt-3 flex flex-col gap-3" role="search">
        <input type="hidden" name="mes" value={mesNoEndereco(mes)} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="busca" className="text-sm font-semibold">Buscar</label>
          <input
            id="busca"
            name="busca"
            type="search"
            defaultValue={filtros.busca}
            maxLength={60}
            placeholder="Categoria, pessoa, conta ou observação"
            className={campo}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tipo" className="text-sm font-semibold">Tipo</label>
            <select id="tipo" name="tipo" defaultValue={filtros.tipo ?? ""} className={campo}>
              <option value="">Todos</option>
              <option value="despesa">Despesas</option>
              <option value="receita">Receitas</option>
              <option value="transferencia">Transferências</option>
            </select>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3">
            <input
              type="checkbox"
              name="aberto"
              value="1"
              defaultChecked={filtros.aberto}
              className="h-5 w-5 accent-[var(--accent)]"
            />
            <span className="font-semibold">Só em aberto</span>
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 font-semibold text-bg">
            Filtrar
          </button>
          {temFiltro(filtros) && (
            <Link href={`/lancamentos?mes=${mesNoEndereco(mes)}`} className={estiloBotao}>
              Limpar filtros
            </Link>
          )}
        </div>
      </form>
    </details>
  );
}

function Totais({ linhas, filtrado }: { linhas: Linha[]; filtrado: boolean }) {
  const receitas = somaDe(linhas, "receita");
  const despesas = somaDe(linhas, "despesa");
  const resultado = Math.round((receitas - despesas) * 100) / 100;
  const cartao = "flex flex-col gap-1 rounded-xl border border-line bg-surface p-3 sm:p-4";
  return (
    <section className="flex flex-col gap-1" aria-label="Totais do mês">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
              Transferências entre suas contas não entram. Com filtro, soma só o que aparece na lista.
            </Ajuda>
          </p>
          <Valor valor={resultado} className="text-sm sm:text-lg" />
        </div>
      </div>
      {filtrado && <p className="text-xs text-muted">Totais só dos lançamentos filtrados.</p>}
    </section>
  );
}

function ItemLancamento({ l, voltar, comData = false }: { l: Linha; voltar: string; comData?: boolean }) {
  const selo = SELO[l.situacao];
  return (
    <li>
      <Link
        href={`/lancamentos/${l.id}?voltar=${encodeURIComponent(voltar)}`}
        className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-bg focus-visible:outline-2 focus-visible:outline-accent"
      >
      <div className="min-w-0">
        <p className="truncate font-semibold" title={l.titulo}>
          {l.titulo}
          {l.parcela && <span className="font-normal text-muted"> · {l.parcela}</span>}
        </p>
        <p className="truncate text-sm text-muted" title={l.detalhe}>{l.detalhe}</p>
        {comData && <p className="text-xs text-muted">Venceu em {formatarData(l.vencimento)}</p>}
        {l.pagamento && l.pagamento !== l.vencimento && (
          <p className="text-xs text-muted">Pago em {formatarData(l.pagamento)}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Valor valor={l.efetivo} tipo={l.tipo} />
        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${selo.classe}`}>{selo.texto}</span>
      </div>
      </Link>
    </li>
  );
}

/** Contas vencidas e não pagas de meses anteriores: aparecem no mês atual para não serem esquecidas. */
function AtrasadosAnteriores({ linhas, voltar }: { linhas: Linha[]; voltar: string }) {
  if (linhas.length === 0) return null;
  const aPagar = somaDe(linhas, "despesa");
  const aReceber = somaDe(linhas, "receita");
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-neg/40 bg-neg/5 p-3" aria-label="Atrasados de meses anteriores">
      <h2 className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-display font-bold text-neg">
          Atrasados de meses anteriores ({linhas.length})
        </span>
        <span className="flex gap-3 text-sm">
          {aPagar > 0 && (
            <span>
              A pagar <Valor valor={aPagar} tipo="despesa" className="text-sm" />
            </span>
          )}
          {aReceber > 0 && (
            <span>
              A receber <Valor valor={aReceber} tipo="receita" className="text-sm" />
            </span>
          )}
        </span>
      </h2>
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {linhas.map((l) => (
          <ItemLancamento key={l.id} l={l} voltar={voltar} comData />
        ))}
      </ul>
    </section>
  );
}

async function ListaDoMes({ searchParams }: { searchParams: Parametros }) {
  await connection();
  const hoje = hojeEmSaoPaulo();
  const params = await searchParams;
  const filtros = lerFiltros(params);
  const mes = mesDoParametro(params.mes, hoje);
  const mesDeHoje = mesDoParametro(undefined, hoje);
  const { inicio, fim } = intervaloDoMes(mes);
  const noMesDeHoje = mes === mesDeHoje;

  const supabase = await createClient();
  const [lancamentos, atrasados, categorias, contas, pessoas] = await Promise.all([
    supabase
      .from("lancamentos")
      .select(COLUNAS)
      .gte("data_vencimento", inicio)
      .lte("data_vencimento", fim)
      .order("data_vencimento", { ascending: false })
      .order("criado_em", { ascending: false }),
    // Só no mês atual: o que venceu antes dele e continua sem pagamento.
    noMesDeHoje
      ? supabase
          .from("lancamentos")
          .select(COLUNAS)
          .is("data_pagamento", null)
          .lt("data_vencimento", inicio)
          .order("data_vencimento")
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("categorias").select("id, nome"),
    supabase.from("contas_financeiras").select("id, instituicao, nome"),
    supabase.from("pessoas").select("id, nome"),
  ]);

  if (lancamentos.error) {
    return (
      <>
        <NavegacaoDoMes mes={mes} mesDeHoje={mesDeHoje} filtros={filtros} />
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

  const montar = (l: NonNullable<typeof lancamentos.data>[number]): Linha => {
    const tipo = l.tipo as Linha["tipo"];
    const conta = nomeConta.get(l.conta_id) ?? "Conta";
    const destino = l.conta_destino_id ? nomeConta.get(l.conta_destino_id) : undefined;
    const pessoa = l.pessoa_id ? nomePessoa.get(l.pessoa_id) : undefined;
    const categoria = l.categoria_id ? nomeCategoria.get(l.categoria_id) : undefined;
    const titulo = tipo === "transferencia" ? "Transferência" : categoria || "Sem categoria";
    const detalhe =
      tipo === "transferencia"
        ? [`${conta} → ${destino ?? "Conta"}`, l.observacao].filter(Boolean).join(" · ")
        : [pessoa, conta, l.observacao].filter(Boolean).join(" · ");
    return {
      id: l.id,
      tipo,
      efetivo: valorEfetivo(Number(l.valor), Number(l.juros), Number(l.multa), Number(l.desconto)),
      vencimento: l.data_vencimento,
      pagamento: l.data_pagamento,
      titulo,
      detalhe,
      busca: [titulo, categoria, pessoa, conta, destino, l.observacao].filter((t): t is string => Boolean(t)),
      parcela: l.parcela_num && l.parcela_total ? `${l.parcela_num}/${l.parcela_total}` : null,
      situacao: situacao(l.data_vencimento, l.data_pagamento, hoje),
    };
  };

  const passa = (l: Linha) =>
    (!filtros.tipo || l.tipo === filtros.tipo) &&
    (!filtros.aberto || l.situacao !== "pago") &&
    combinaBusca(filtros.busca, l.busca);

  const todas = (lancamentos.data ?? []).map(montar);
  const linhas = todas.filter(passa);
  const anteriores = (atrasados.data ?? []).map(montar).filter(passa);

  // Endereço desta lista (sem o aviso), para voltar a ela depois de quitar.
  const voltar = `/lancamentos${enderecoComFiltros(mesNoEndereco(mes), filtros)}`;
  const aviso = params.aviso ? AVISOS[params.aviso] : undefined;

  const dias = new Map<string, Linha[]>();
  for (const l of linhas) dias.set(l.vencimento, [...(dias.get(l.vencimento) ?? []), l]);

  return (
    <>
      {aviso && (
        <p className="rounded-lg bg-pos/10 px-4 py-3 font-semibold text-pos" role="status">
          {aviso}
        </p>
      )}
      <NavegacaoDoMes mes={mes} mesDeHoje={mesDeHoje} filtros={filtros} />
      <AtrasadosAnteriores linhas={anteriores} voltar={voltar} />
      <Totais linhas={linhas} filtrado={temFiltro(filtros)} />
      <BarraDeFiltros mes={mes} filtros={filtros} />
      {linhas.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line bg-surface p-6">
          {todas.length > 0 ? (
            <>
              <p className="font-semibold">Nenhum lançamento com esse filtro</p>
              <p className="text-muted">
                Este mês tem {todas.length} {todas.length === 1 ? "lançamento" : "lançamentos"}, mas
                nenhum combina com o filtro escolhido.
              </p>
              <Link href={`/lancamentos?mes=${mesNoEndereco(mes)}`} className={estiloBotao}>
                Limpar filtros
              </Link>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {temFiltro(filtros) && (
            <p className="text-sm text-muted">
              {linhas.length} de {todas.length} lançamentos do mês.
            </p>
          )}
          {[...dias.entries()].map(([dia, doDia]) => (
            <section key={dia} aria-label={formatarData(dia)} className="flex flex-col gap-2">
              <h2 className="flex items-baseline gap-2 text-sm font-semibold text-muted">
                <span className="text-fg">{formatarData(dia).slice(0, 5)}</span>
                <span>{diaDaSemana(dia)}</span>
                {dia === hoje && <span className="rounded bg-accent px-1.5 text-xs text-bg">hoje</span>}
              </h2>
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {doDia.map((l) => (
                  <ItemLancamento key={l.id} l={l} voltar={voltar} />
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
