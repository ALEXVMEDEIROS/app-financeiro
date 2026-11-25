"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { AvisoErro } from "@/components/campo";
import { Ajuda } from "@/components/ui/ajuda";
import { Botao } from "@/components/ui/botao";
import { CampoValor, SelecaoAgrupada, type GrupoDeOpcoes } from "@/components/ui/campos";
import { criarLancamento, type EstadoLancamento } from "../acoes";

export type Opcao = { id: string; rotulo: string };
export type CategoriaOpcao = { id: string; nome: string; grupo: string; natureza: "receita" | "despesa"; ordem: number };
export type Tipo = "despesa" | "receita" | "transferencia";
/** Últimas escolhas por tipo, sugeridas ao abrir o formulário. */
export type Sugestoes = Partial<Record<Tipo, { categoria?: string; conta?: string; destino?: string }>>;

const TIPOS: { valor: Tipo; rotulo: string; cor: string }[] = [
  { valor: "despesa", rotulo: "− Despesa", cor: "bg-neg text-bg" },
  { valor: "receita", rotulo: "+ Receita", cor: "bg-pos text-bg" },
  { valor: "transferencia", rotulo: "⇄ Transferir", cor: "bg-fg text-bg" },
];

export function FormLancamento({
  hoje,
  tipoInicial,
  contas,
  categorias,
  centros,
  formas,
  sugestoes,
}: {
  hoje: string;
  tipoInicial: Tipo;
  contas: Opcao[];
  categorias: CategoriaOpcao[];
  centros: Opcao[];
  formas: Opcao[];
  sugestoes: Sugestoes;
}) {
  const [estado, acao, salvando] = useActionState(criarLancamento, {} as EstadoLancamento);
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);
  const [data, setData] = useState(hoje);
  // "Já pago" acompanha a data (hoje ou antes = pago) até o usuário mexer nele.
  const [pagoManual, setPagoManual] = useState<boolean | null>(null);
  const pago = pagoManual ?? data <= hoje;
  const transferencia = tipo === "transferencia";

  // Depois de um erro, vale o que o usuário tinha escolhido; senão, a sugestão do tipo.
  const voltouComErro = estado.valores?.tipo === tipo;
  const sugestao = sugestoes[tipo] ?? {};
  const inicial = {
    categoria: voltouComErro ? estado.valores?.categoria : sugestao.categoria,
    conta: voltouComErro ? estado.valores?.conta : sugestao.conta ?? (contas.length === 1 ? contas[0].id : undefined),
    destino: voltouComErro ? estado.valores?.destino : sugestao.destino,
  };

  const gruposDeCategoria = useMemo<GrupoDeOpcoes[]>(() => {
    if (transferencia) return [];
    const porGrupo = new Map<string, { ordem: number; opcoes: { valor: string; rotulo: string }[] }>();
    for (const c of categorias.filter((c) => c.natureza === tipo)) {
      const g = porGrupo.get(c.grupo) ?? { ordem: c.ordem, opcoes: [] };
      g.opcoes.push({ valor: c.id, rotulo: c.nome });
      porGrupo.set(c.grupo, g);
    }
    return [...porGrupo.entries()]
      .sort(([, a], [, b]) => a.ordem - b.ordem)
      .map(([grupo, g]) => ({ grupo, opcoes: g.opcoes }));
  }, [categorias, tipo, transferencia]);

  const opcoesContas = [{ grupo: "", opcoes: contas.map((c) => ({ valor: c.id, rotulo: c.rotulo })) }];
  const textoPago = tipo === "despesa" ? "Já paguei" : tipo === "receita" ? "Já recebi" : "Já foi feita";

  return (
    <form action={acao} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <fieldset className="grid grid-cols-3 gap-1 rounded-lg bg-bg p-1">
        <legend className="sr-only">Tipo do lançamento</legend>
        {TIPOS.map((t) => (
          <label
            key={t.valor}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md text-sm font-semibold sm:text-base ${
              tipo === t.valor ? t.cor : "text-muted"
            }`}
          >
            <input
              type="radio"
              name="tipo"
              value={t.valor}
              checked={tipo === t.valor}
              onChange={() => setTipo(t.valor)}
              className="sr-only"
            />
            {t.rotulo}
          </label>
        ))}
      </fieldset>

      <CampoValor id="valor" rotulo="Valor" erro={estado.erros?.valor} />

      {!transferencia && (
        // key: ao trocar o tipo, a lista recomeça com a sugestão daquele tipo
        <SelecaoAgrupada
          key={`categoria-${tipo}`}
          id="categoria"
          rotulo="Categoria"
          grupos={gruposDeCategoria}
          valorInicial={inicial.categoria}
          erro={estado.erros?.categoria}
          ajuda={
            <Ajuda titulo="Categoria">
              Só aparecem as categorias de {tipo}. Você poderá criar as suas em Configurações.
            </Ajuda>
          }
        />
      )}

      <SelecaoAgrupada
        key={`conta-${tipo}`}
        id="conta"
        rotulo={tipo === "receita" ? "Entrou na conta" : "Saiu da conta"}
        grupos={opcoesContas}
        valorInicial={inicial.conta}
        erro={estado.erros?.conta}
      />

      {transferencia && (
        <SelecaoAgrupada
          key="destino"
          id="destino"
          rotulo="Entrou na conta"
          grupos={opcoesContas}
          valorInicial={inicial.destino}
          erro={estado.erros?.destino}
          ajuda={
            <Ajuda titulo="Transferência">
              Dinheiro que passa de uma conta sua para outra, como da conta corrente para a poupança.
              Não conta como receita nem como despesa: só muda o saldo das duas contas.
            </Ajuda>
          }
        />
      )}

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2">
          <label htmlFor="data" className="text-sm font-semibold">
            {pago ? "Data" : "Vencimento"}
          </label>
          <Ajuda titulo="Data">
            Para o que já aconteceu, a data em que aconteceu. Para o que ainda vai vencer, a data de
            vencimento: o lançamento fica em aberto até você marcar como pago.
          </Ajuda>
        </span>
        <input
          id="data"
          name="data"
          type="date"
          value={data}
          min="2000-01-01"
          max="2100-12-31"
          onChange={(e) => setData(e.target.value)}
          aria-invalid={Boolean(estado.erros?.data)}
          className={`min-h-11 rounded-lg border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            estado.erros?.data ? "border-neg" : "border-line"
          }`}
        />
        {estado.erros?.data && <p className="text-sm text-neg">{estado.erros.data}</p>}
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line px-3">
        <input
          type="checkbox"
          name="pago"
          checked={pago}
          onChange={(e) => setPagoManual(e.target.checked)}
          className="h-5 w-5 accent-[var(--accent)]"
        />
        <span className="font-semibold">{textoPago}</span>
        <span className="text-sm text-muted">{pago ? "" : "fica em aberto"}</span>
      </label>

      <details className="rounded-lg border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold text-accent">Mais detalhes</summary>
        <div className="mt-3 flex flex-col gap-4">
          {!transferencia && (
            <>
              <SelecaoAgrupada
                id="centro_custo"
                rotulo="Centro de custo"
                vazio="Nenhum"
                opcional
                valorInicial={estado.valores?.centro}
                grupos={[{ grupo: "", opcoes: centros.map((c) => ({ valor: c.id, rotulo: c.rotulo })) }]}
                ajuda={<Ajuda titulo="Centro de custo">Separa o que é de casa e o que é do trabalho nos relatórios.</Ajuda>}
              />
              <SelecaoAgrupada
                id="forma_pagamento"
                rotulo="Forma de pagamento"
                vazio="Não informar"
                opcional
                valorInicial={estado.valores?.forma}
                grupos={[{ grupo: "", opcoes: formas.map((f) => ({ valor: f.id, rotulo: f.rotulo })) }]}
              />
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="observacao" className="text-sm font-semibold">Observação</label>
            <textarea
              id="observacao"
              name="observacao"
              rows={2}
              maxLength={500}
              defaultValue={estado.valores?.observacao}
              className="rounded-lg border border-line bg-surface px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            {estado.erros?.observacao && <p className="text-sm text-neg">{estado.erros.observacao}</p>}
          </div>
        </div>
      </details>

      <AvisoErro mensagem={estado.mensagem} />

      <div className="flex flex-wrap gap-3 pt-1">
        <Botao type="submit" name="depois" value="contas" disabled={salvando} className="flex-1 sm:flex-none">
          {salvando ? "Salvando…" : "Salvar"}
        </Botao>
        <Botao type="submit" name="depois" value="outro" variante="secundario" disabled={salvando} className="flex-1 sm:flex-none">
          Salvar e lançar outro
        </Botao>
        <Link href="/painel" className="inline-flex min-h-11 items-center px-2 font-semibold text-muted">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
