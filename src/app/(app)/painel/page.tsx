import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Ajuda } from "@/components/ui/ajuda";
import { Valor } from "@/components/ui/valor";
import { formatarData, hojeEmSaoPaulo, intervaloDoMes, nomeDoMes } from "@/lib/datas";
import { formatarPercentual, resumir, serieDeMeses, ultimosMeses, type Resumo } from "@/lib/relatorios";
import { createClient } from "@/lib/supabase/server";
import { GraficoResultado } from "./grafico-resultado";
import { OrigemDosJuros } from "./origem-juros";
import { Vencimentos } from "./vencimentos";

export const metadata: Metadata = {
  title: "Painel · Sobra Vida",
  robots: { index: false, follow: false },
};

function PrimeirosPassos({ contas, lancamentos }: { contas: number; lancamentos: number }) {
  const passos = [
    { feito: contas > 0, texto: "Cadastre suas contas com o saldo de hoje", href: "/contas/nova" },
    { feito: lancamentos > 0, texto: "Lance suas receitas e despesas", href: "/lancamentos/novo" },
    { feito: false, texto: "Ajuste o plano de contas ao seu jeito", href: "/configuracoes/plano-de-contas" },
  ];
  return (
    <section className="flex flex-col gap-2" aria-label="Primeiros passos">
      <h2 className="font-display text-lg font-bold">Primeiros passos</h2>
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
    </section>
  );
}

function Saldos({ hoje, previsto, fimDoMes }: { hoje: number; previsto: number; fimDoMes: string }) {
  const cartao = "flex flex-col gap-1 rounded-xl border border-line bg-surface p-4";
  return (
    <section className="grid gap-3 sm:grid-cols-2" aria-label="Saldos">
      <Link href="/contas" className={`${cartao} hover:border-muted`}>
        <span className="flex items-center gap-2 text-sm font-semibold text-muted">Saldo de hoje</span>
        <Valor valor={hoje} className="font-display text-3xl" />
        <span className="text-xs text-muted">Soma das contas ativas, com o que já foi pago ou recebido.</span>
      </Link>
      <Link href="/contas" className={`${cartao} hover:border-muted`}>
        <span className="text-sm font-semibold text-muted">Previsto em {formatarData(fimDoMes).slice(0, 5)}</span>
        <Valor valor={previsto} className="font-display text-3xl" />
        <span className="text-xs text-muted">Hoje mais o que está em aberto até o fim do mês, inclusive atrasados.</span>
      </Link>
    </section>
  );
}

function LinhaResumo({ rotulo, realizado, previsto, tipo }: {
  rotulo: string;
  realizado: number;
  previsto: number;
  tipo?: "receita" | "despesa";
}) {
  return (
    <tr className="border-t border-line">
      <th scope="row" className="py-2 text-left font-semibold">{rotulo}</th>
      <td className="py-2 text-right"><Valor valor={realizado} tipo={tipo} /></td>
      <td className="py-2 text-right"><Valor valor={previsto} tipo={tipo} className="opacity-80" /></td>
    </tr>
  );
}

function ResultadoDoMes({ mes, caixa, previsto }: { mes: string; caixa: Resumo; previsto: Resumo }) {
  const sobra = caixa.resultado >= 0;
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4" aria-label="Resultado do mês">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold first-letter:uppercase">
          {nomeDoMes(mes)}
          <Ajuda titulo="Resultado do mês">
            Realizado: o que de fato entrou e saiu, pela data do pagamento. Previsto: o mês pelo
            vencimento, incluindo o que ainda está em aberto. Transferências entre suas contas não
            entram. Juros e multas pagos contam como despesa.
          </Ajuda>
        </h2>
        <p className={`text-sm font-semibold ${sobra ? "text-pos" : "text-neg"}`}>
          {sobra ? "Sobrou" : "Faltou"} até agora
        </p>
      </div>
      <Valor valor={caixa.resultado} className="font-display text-3xl" />
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-xs text-muted">
            <th scope="col" className="pb-1 text-left font-semibold"><span className="sr-only">Item</span></th>
            <th scope="col" className="pb-1 text-right font-semibold">Realizado</th>
            <th scope="col" className="pb-1 text-right font-semibold">Previsto</th>
          </tr>
        </thead>
        <tbody>
          <LinhaResumo rotulo="Receitas" realizado={caixa.receitas} previsto={previsto.receitas} tipo="receita" />
          <LinhaResumo rotulo="Despesas" realizado={caixa.despesas} previsto={previsto.despesas} tipo="despesa" />
          <LinhaResumo rotulo="Resultado" realizado={caixa.resultado} previsto={previsto.resultado} />
          <tr className="border-t border-line text-muted">
            <th scope="row" className="py-2 text-left font-semibold">
              <span className="flex items-center gap-2">
                Lucratividade
                <Ajuda titulo="Lucratividade">
                  Quanto das receitas sobrou: resultado ÷ receitas. Ex.: recebeu 1.000 e sobraram 200 = 20%.
                </Ajuda>
              </span>
            </th>
            <td className="py-2 text-right font-semibold">{formatarPercentual(caixa.lucratividade)}</td>
            <td className="py-2 text-right font-semibold">{formatarPercentual(previsto.lucratividade)}</td>
          </tr>
        </tbody>
      </table>
      <Link href="/lancamentos" className="self-start text-sm font-semibold text-accent underline-offset-4 hover:underline">
        Ver os lançamentos do mês
      </Link>
    </section>
  );
}

function JurosDoMes({ mes, doMes, doAno, economia, children }: {
  mes: string;
  doMes: number;
  doAno: number;
  economia: number;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-4" aria-label="Juros e multas">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
        Juros e multas pagos em {mes}
        <Ajuda titulo="Juros e multas">
          O custo dos atrasos: juros e multas das contas pagas depois do vencimento, pela data do
          pagamento. Descontos obtidos aparecem como economia.
        </Ajuda>
      </h2>
      <Valor valor={doMes} tipo={doMes > 0 ? "despesa" : undefined} className="font-display text-2xl" />
      <p className="text-xs text-muted">
        No ano: {doAno > 0 ? <Valor valor={doAno} tipo="despesa" className="text-xs" /> : "nenhum"}
        {economia > 0 && (
          <>
            {" "}· Descontos obtidos no ano: <Valor valor={economia} tipo="receita" className="text-xs" />
          </>
        )}
      </p>
      {children}
    </section>
  );
}

async function Painel() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const usuarioId = data?.claims?.sub;
  if (!usuarioId) redirect("/entrar?proxima=/painel");

  const hoje = hojeEmSaoPaulo();
  const { inicio, fim } = intervaloDoMes(hoje);
  const ano = Number(hoje.slice(0, 4));
  const mes = Number(hoje.slice(5, 7));

  const meses6 = ultimosMeses(hoje, 6);
  const anoAnterior = meses6[0].ano < ano ? meses6[0].ano : null;
  const [{ data: perfil }, { count: lancamentos }, saldos, caixa, previsto, encargos, caixaAnterior] = await Promise.all([
    supabase.from("perfis").select("nome").eq("id", usuarioId).single(),
    supabase.from("lancamentos").select("id", { count: "exact", head: true }),
    supabase.rpc("saldos_contas", { p_data_atual: hoje, p_data_prevista: fim }),
    supabase.rpc("resultado_mensal", { p_ano: ano, p_visao: "caixa" }),
    supabase.rpc("resultado_mensal", { p_ano: ano, p_visao: "previsto" }),
    supabase.rpc("encargos_por_mes", { p_ano: ano }),
    anoAnterior
      ? supabase.rpc("resultado_mensal", { p_ano: anoAnterior, p_visao: "caixa" })
      : Promise.resolve({ data: [], error: null }),
  ]);
  const serie = serieDeMeses(meses6, {
    [ano]: caixa.data ?? [],
    ...(anoAnterior ? { [anoAnterior]: caixaAnterior.data ?? [] } : {}),
  });
  const centavos = (v: number | string) => Math.round(Number(v) * 100);
  const enc = encargos.data ?? [];
  const jurosDoMes = enc.filter((e) => e.mes === mes).reduce((s, e) => s + centavos(e.juros_pagos) + centavos(e.multas_pagas), 0) / 100;
  const jurosDoAno = enc.reduce((s, e) => s + centavos(e.juros_pagos) + centavos(e.multas_pagas), 0) / 100;
  const economia = enc.reduce((s, e) => s + centavos(e.descontos_obtidos), 0) / 100;

  const primeiroNome = (perfil?.nome ?? "").split(" ")[0] || "por aqui";
  const ativas = (saldos.data ?? []).filter((c) => c.ativa);
  const soma = (campo: "saldo_atual" | "saldo_previsto") =>
    ativas.reduce((s, c) => s + Math.round(Number(c[campo]) * 100), 0) / 100;
  const erro = saldos.error || caixa.error || previsto.error || encargos.error;

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Olá, {primeiroNome}!</h1>
      {erro && (
        <p className="rounded-lg bg-neg/10 px-3 py-2 text-neg" role="alert">
          Não foi possível carregar todos os números agora. Atualize a página em alguns instantes.
        </p>
      )}
      {ativas.length === 0 || (lancamentos ?? 0) === 0 ? (
        <PrimeirosPassos contas={ativas.length} lancamentos={lancamentos ?? 0} />
      ) : null}
      {ativas.length > 0 && (
        <>
          <Saldos hoje={soma("saldo_atual")} previsto={soma("saldo_previsto")} fimDoMes={fim} />
          <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-line" />}>
            <Vencimentos hoje={hoje} />
          </Suspense>
          <ResultadoDoMes mes={inicio} caixa={resumir(caixa.data ?? [], mes)} previsto={resumir(previsto.data ?? [], mes)} />
          <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4" aria-label="Últimos 6 meses">
            <h2 className="font-display text-lg font-bold">Quanto sobrou nos últimos 6 meses</h2>
            <GraficoResultado meses={serie} />
          </section>
          <JurosDoMes mes={nomeDoMes(inicio).split(" ")[0]} doMes={jurosDoMes} doAno={jurosDoAno} economia={economia}>
            {jurosDoMes > 0 && (
              <Suspense fallback={null}>
                <OrigemDosJuros inicio={inicio} fim={fim} />
              </Suspense>
            )}
          </JurosDoMes>
        </>
      )}
    </div>
  );
}

export default function PaginaPainel() {
  return (
    <Suspense fallback={<p className="text-muted">Carregando…</p>}>
      <Painel />
    </Suspense>
  );
}
