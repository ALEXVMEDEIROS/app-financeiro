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

type Tipo = "despesa" | "receita";

export function FormLancamento({
  hoje,
  contas,
  categorias,
  centros,
  formas,
}: {
  hoje: string;
  contas: Opcao[];
  categorias: CategoriaOpcao[];
  centros: Opcao[];
  formas: Opcao[];
}) {
  const [estado, acao, salvando] = useActionState(criarLancamento, {} as EstadoLancamento);
  const [tipo, setTipo] = useState<Tipo>("despesa");
  const [data, setData] = useState(hoje);
  // "Já pago" acompanha a data (hoje ou antes = pago) até o usuário mexer nele.
  const [pagoManual, setPagoManual] = useState<boolean | null>(null);
  const pago = pagoManual ?? data <= hoje;

  const gruposDeCategoria = useMemo<GrupoDeOpcoes[]>(() => {
    const porGrupo = new Map<string, { ordem: number; opcoes: { valor: string; rotulo: string }[] }>();
    for (const c of categorias.filter((c) => c.natureza === tipo)) {
      const g = porGrupo.get(c.grupo) ?? { ordem: c.ordem, opcoes: [] };
      g.opcoes.push({ valor: c.id, rotulo: c.nome });
      porGrupo.set(c.grupo, g);
    }
    return [...porGrupo.entries()]
      .sort(([, a], [, b]) => a.ordem - b.ordem)
      .map(([grupo, g]) => ({ grupo, opcoes: g.opcoes }));
  }, [categorias, tipo]);

  const textoPago = tipo === "despesa" ? "Já paguei" : "Já recebi";

  return (
    <form action={acao} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <fieldset className="grid grid-cols-2 gap-2 rounded-lg bg-bg p-1">
        <legend className="sr-only">Tipo do lançamento</legend>
        {(["despesa", "receita"] as Tipo[]).map((t) => (
          <label
            key={t}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md font-semibold ${
              tipo === t ? (t === "despesa" ? "bg-neg text-bg" : "bg-pos text-bg") : "text-muted"
            }`}
          >
            <input
              type="radio"
              name="tipo"
              value={t}
              checked={tipo === t}
              onChange={() => setTipo(t)}
              className="sr-only"
            />
            {t === "despesa" ? "− Despesa" : "+ Receita"}
          </label>
        ))}
      </fieldset>

      <CampoValor id="valor" rotulo="Valor" erro={estado.erros?.valor} />

      {/* key: ao trocar o tipo, a lista recomeça (categorias de receita x despesa) */}
      <SelecaoAgrupada
        key={tipo}
        id="categoria"
        rotulo="Categoria"
        grupos={gruposDeCategoria}
        valorInicial={estado.valores?.categoria}
        erro={estado.erros?.categoria}
        ajuda={
          <Ajuda titulo="Categoria">
            Só aparecem as categorias de {tipo}. Você poderá criar as suas em Configurações.
          </Ajuda>
        }
      />

      <SelecaoAgrupada
        id="conta"
        rotulo={tipo === "despesa" ? "Saiu da conta" : "Entrou na conta"}
        grupos={[{ grupo: "", opcoes: contas.map((c) => ({ valor: c.id, rotulo: c.rotulo })) }]}
        valorInicial={estado.valores?.conta || (contas.length === 1 ? contas[0].id : undefined)}
        erro={estado.erros?.conta}
      />

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2">
          <label htmlFor="data" className="text-sm font-semibold">
            {pago ? "Data" : "Vencimento"}
          </label>
          <Ajuda titulo="Data">
            Para o que já foi pago, a data do pagamento. Para o que ainda vai vencer, a data de
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
        <Botao type="submit" disabled={salvando} className="flex-1 sm:flex-none">
          {salvando ? "Salvando…" : "Salvar"}
        </Botao>
        <Link href="/painel" className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 font-semibold">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
