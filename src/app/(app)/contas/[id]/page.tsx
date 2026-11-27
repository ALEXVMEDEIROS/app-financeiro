import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Ajuda } from "@/components/ui/ajuda";
import { Valor } from "@/components/ui/valor";
import { resumoDadosBancarios } from "@/lib/bancos";
import { diaDaSemana, formatarData, hojeEmSaoPaulo, intervaloDoMes, mesDoParametro, nomeDoMes, somarMeses } from "@/lib/datas";
import { formatarNumero } from "@/lib/dinheiro";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Extrato da conta · Sobra Vida", robots: { index: false } };

// Extrato de uma conta (R6, pedido do usuário): o que já aconteceu no mês, pela
// data do pagamento, com o saldo acumulado. O que está em aberto fica no fluxo
// de caixa filtrado pela conta.

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ mes?: string }> };

const NOME_TIPO: Record<string, string> = {
  banco: "Banco",
  corretora: "Investimentos",
  carteira: "Carteira",
  caixa: "Caixa",
};

async function Extrato({ params, searchParams }: Props) {
  await connection();
  const { id } = await params;
  const { mes: textoMes } = await searchParams;
  const hoje = hojeEmSaoPaulo();
  const mes = mesDoParametro(textoMes, hoje);
  const mesDeHoje = mesDoParametro(undefined, hoje);
  const { inicio, fim } = intervaloDoMes(mes);

  const supabase = await createClient();
  const { data: conta } = await supabase
    .from("contas_financeiras")
    .select("id, instituicao, nome, tipo, ativa, codigo_banco, agencia, numero_conta, data_saldo_inicial")
    .eq("id", id)
    .maybeSingle();
  // A proteção por usuário faz a conta de outra pessoa simplesmente não aparecer.
  if (!conta) notFound();

  const [{ data: linhas, error }, saldos] = await Promise.all([
    supabase.rpc("extrato_conta", { p_conta: id, p_inicio: inicio, p_fim: fim }),
    supabase.rpc("saldos_contas", { p_data_atual: hoje, p_data_prevista: intervaloDoMes(hoje).fim }),
  ]);
  const saldoConta = (saldos.data ?? []).find((s) => s.conta_id === id);

  const titulo = conta.instituicao ? `${conta.instituicao} · ${conta.nome}` : conta.nome;
  const dados = resumoDadosBancarios(conta);
  const aqui = `/contas/${id}?mes=${mes.slice(0, 7)}`;
  const botao =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-surface px-3 font-semibold hover:border-muted";

  const movimentos = (linhas ?? []).filter((l) => l.ordem > 0);
  const anterior = Number((linhas ?? []).find((l) => l.ordem === 0)?.saldo ?? 0);
  const final = movimentos.length ? Number(movimentos[movimentos.length - 1].saldo) : anterior;
  const centavos = (l: number[]) => l.reduce((s, v) => s + Math.round(v * 100), 0) / 100;
  const entradas = centavos(movimentos.map((m) => Number(m.valor)).filter((v) => v > 0));
  const saidas = -centavos(movimentos.map((m) => Number(m.valor)).filter((v) => v < 0));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{NOME_TIPO[conta.tipo] ?? conta.tipo}</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">{titulo}</h1>
          {dados && <p className="text-sm text-muted tabular-nums">{dados}</p>}
          {!conta.ativa && <p className="text-sm font-semibold text-warn">Conta desativada</p>}
        </div>
        <Link href={`/contas/${id}/editar`} className={botao}>
          Editar conta
        </Link>
      </div>

      {saldoConta && (
        <section className="grid grid-cols-2 gap-2" aria-label="Saldos da conta">
          <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-3">
            <span className="text-xs font-semibold text-muted">Saldo de hoje</span>
            <Valor valor={Number(saldoConta.saldo_atual)} className="text-lg" />
          </div>
          <Link
            href={`/relatorios/fluxo?mes=${mesDeHoje.slice(0, 7)}&conta=${id}`}
            className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-3 hover:border-muted"
          >
            <span className="text-xs font-semibold text-muted">Previsto no fim do mês</span>
            <Valor valor={Number(saldoConta.saldo_previsto)} className="text-lg" />
            <span className="text-xs font-semibold text-accent">Ver o previsto desta conta</span>
          </Link>
        </section>
      )}

      <nav className="flex items-center gap-2" aria-label="Mudar de mês">
        <Link href={`/contas/${id}?mes=${somarMeses(mes, -1).slice(0, 7)}`} className={botao} aria-label="Mês anterior">‹</Link>
        <p className="min-w-0 flex-1 text-center font-display text-xl font-bold first-letter:uppercase">{nomeDoMes(mes)}</p>
        <Link href={`/contas/${id}?mes=${somarMeses(mes, 1).slice(0, 7)}`} className={botao} aria-label="Mês seguinte">›</Link>
        {mes !== mesDeHoje && (
          <Link href={`/contas/${id}`} className={`${botao} text-sm`}>Hoje</Link>
        )}
      </nav>

      {error ? (
        <p className="rounded-lg bg-neg/10 px-3 py-2 text-neg" role="alert">
          Não foi possível carregar o extrato agora. Atualize a página em alguns instantes.
        </p>
      ) : (
        <>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted tabular-nums">
            <span>
              Entradas <span className="font-semibold text-pos">+{formatarNumero(entradas)}</span>
            </span>
            <span>
              Saídas <span className="font-semibold text-neg">−{formatarNumero(saidas)}</span>
            </span>
            <span className="flex items-center gap-1">
              Só o que já aconteceu
              <Ajuda titulo="Extrato">
                Movimentos pagos ou recebidos nesta conta, pela data do pagamento, com o saldo depois de
                cada um. O que ainda está em aberto aparece em &quot;Ver o previsto desta conta&quot;.
              </Ajuda>
            </span>
          </p>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            <li className="flex items-center justify-between gap-3 bg-bg px-4 py-3 text-sm">
              <span className="font-semibold text-muted">
                Saldo em {formatarData(somarDia(inicio, -1)).slice(0, 5)}
                {inicio <= conta.data_saldo_inicial && " (saldo inicial)"}
              </span>
              <span className="font-semibold tabular-nums">{formatarNumero(anterior)}</span>
            </li>
            {movimentos.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted">Nenhum movimento neste mês.</li>
            ) : (
              movimentos.map((m) => {
                const valor = Number(m.valor);
                const titulo =
                  m.tipo === "transferencia"
                    ? valor < 0 ? `Transferência para ${m.outra_conta ?? "outra conta"}` : `Transferência de ${m.outra_conta ?? "outra conta"}`
                    : m.categoria ?? "Sem categoria";
                const detalhe = [m.pessoa, m.observacao].filter(Boolean).join(" · ");
                return (
                  <li key={`${m.lancamento_id}-${m.ordem}`}>
                    <Link
                      href={`/lancamentos/${m.lancamento_id}?voltar=${encodeURIComponent(aqui)}`}
                      className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-bg"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{titulo}</span>
                        <span className="block truncate text-sm text-muted">
                          {formatarData(m.data).slice(0, 5)} {diaDaSemana(m.data).slice(0, 3)}
                          {detalhe && ` · ${detalhe}`}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end">
                        <Valor valor={valor} />
                        <span className="text-xs text-muted tabular-nums">saldo {formatarNumero(Number(m.saldo))}</span>
                      </span>
                    </Link>
                  </li>
                );
              })
            )}
            <li className="flex items-center justify-between gap-3 bg-bg px-4 py-3 text-sm">
              <span className="font-semibold">
                {mes === mesDeHoje ? "Saldo hoje" : `Saldo em ${formatarData(fim).slice(0, 5)}`}
              </span>
              <span className="font-semibold tabular-nums">{formatarNumero(final)}</span>
            </li>
          </ul>
        </>
      )}
      <Link href="/contas" className="inline-flex min-h-11 items-center font-semibold text-accent">
        ← Voltar para Contas
      </Link>
    </div>
  );
}

/** Soma dias a uma data ISO. */
function somarDia(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default function PaginaExtrato(props: Props) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Suspense fallback={<p className="text-muted">Carregando extrato…</p>}>
        <Extrato {...props} />
      </Suspense>
    </div>
  );
}
