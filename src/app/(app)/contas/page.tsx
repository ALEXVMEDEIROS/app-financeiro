import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Ajuda } from "@/components/ui/ajuda";
import { Valor } from "@/components/ui/valor";
import { formatarData, hojeEmSaoPaulo, intervaloDoMes } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Contas · Sobra Vida", robots: { index: false } };

const NOME_TIPO: Record<string, string> = {
  banco: "Banco",
  corretora: "Corretora",
  carteira: "Carteira",
  caixa: "Caixa",
};

type LinhaSaldo = {
  conta_id: string;
  nome: string;
  tipo: string;
  ativa: boolean;
  saldo_atual: number;
  saldo_previsto: number;
};

function CartaoConta({ conta, fimDoMes }: { conta: LinhaSaldo; fimDoMes: string }) {
  return (
    <li>
      <Link
        href={`/contas/${conta.conta_id}`}
        className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 hover:border-muted focus-visible:outline-2 focus-visible:outline-accent"
      >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold" title={conta.nome}>{conta.nome}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{NOME_TIPO[conta.tipo] ?? conta.tipo}</p>
        </div>
        <Valor valor={Number(conta.saldo_atual)} className="text-lg" />
      </div>
      <p className="flex items-center justify-between gap-3 border-t border-line pt-2 text-sm text-muted">
        <span>Previsto em {formatarData(fimDoMes).slice(0, 5)}</span>
        <Valor valor={Number(conta.saldo_previsto)} className="text-sm" />
      </p>
      </Link>
    </li>
  );
}

function TelaVazia() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line bg-surface p-6">
      <p className="font-display text-xl font-bold">Cadastre sua primeira conta</p>
      <p className="text-muted">
        Contas são os lugares onde seu dinheiro fica: conta corrente, poupança, corretora, carteira
        ou o caixa do escritório. Informe o saldo de hoje e o Sobra Vida acompanha daqui para frente.
      </p>
      <Link href="/contas/nova" className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 font-semibold text-bg">
        Cadastrar conta
      </Link>
    </div>
  );
}

async function ListaDeContas() {
  // "Hoje" depende do momento do acesso: a lista é montada a cada visita.
  await connection();
  const hoje = hojeEmSaoPaulo();
  const { fim } = intervaloDoMes(hoje);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("saldos_contas", {
    p_data_atual: hoje,
    p_data_prevista: fim,
  });

  if (error) {
    return (
      <p className="rounded-lg bg-neg/10 px-3 py-2 text-neg" role="alert">
        Não foi possível carregar suas contas agora. Atualize a página em alguns instantes.
      </p>
    );
  }

  const contas = (data ?? []) as LinhaSaldo[];
  const ativas = contas.filter((c) => c.ativa);
  const desativadas = contas.filter((c) => !c.ativa);

  if (contas.length === 0) return <TelaVazia />;

  const totalHoje = ativas.reduce((s, c) => s + Number(c.saldo_atual), 0);
  const totalPrevisto = ativas.reduce((s, c) => s + Number(c.saldo_previsto), 0);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-3 sm:grid-cols-2" aria-label="Totais">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted">
            Saldo de hoje
            <Ajuda titulo="Saldo de hoje">
              Soma das contas ativas considerando só o que já foi pago ou recebido até hoje.
            </Ajuda>
          </p>
          <Valor valor={totalHoje} className="font-display text-2xl" />
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted">
            Previsto em {formatarData(fim).slice(0, 5)}
            <Ajuda titulo="Saldo previsto">
              O saldo de hoje mais o que está em aberto até o fim do mês, incluindo contas atrasadas.
            </Ajuda>
          </p>
          <Valor valor={totalPrevisto} className="font-display text-2xl" />
        </div>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2">
        {ativas.map((c) => (
          <CartaoConta key={c.conta_id} conta={c} fimDoMes={fim} />
        ))}
      </ul>

      {desativadas.length > 0 && (
        <details className="rounded-xl border border-line p-4">
          <summary className="cursor-pointer font-semibold text-muted">
            Contas desativadas ({desativadas.length})
          </summary>
          <ul className="mt-3 grid gap-3 opacity-70 sm:grid-cols-2">
            {desativadas.map((c) => (
              <CartaoConta key={c.conta_id} conta={c} fimDoMes={fim} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function PaginaContas() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Contas</h1>
        <Link
          href="/contas/nova"
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 font-semibold hover:border-muted"
        >
          + Nova conta
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted">Carregando contas…</p>}>
        <ListaDeContas />
      </Suspense>
    </div>
  );
}
