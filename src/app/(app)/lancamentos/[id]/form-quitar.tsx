"use client";

import { useActionState, useState } from "react";
import { AvisoErro } from "@/components/campo";
import { Ajuda } from "@/components/ui/ajuda";
import { Botao } from "@/components/ui/botao";
import { dataValida } from "@/lib/datas";
import { formatarMoeda, formatarNumero, lerValor } from "@/lib/dinheiro";
import { diasDeAtraso, jurosAoMes, valorDoPercentual } from "@/lib/encargos";
import { valorEfetivo } from "@/lib/parcelas";
import { quitarLancamento, type EstadoQuitar } from "../quitar";

type Modo = "reais" | "percentual";
type Entrada = { modo: Modo; texto: string };
const VAZIO: Entrada = { modo: "reais", texto: "" };

/** Valor em reais de uma entrada (null se inválida); vazio vale zero. */
function emReais(e: Entrada, calcular: (p: number) => number): number | null {
  if (e.texto.trim() === "") return 0;
  const n = lerValor(e.texto);
  if (n === null) return null;
  return e.modo === "reais" ? n : calcular(n);
}

/**
 * Juros, multa ou desconto em R$ ou em %. No modo %, o valor em reais é
 * calculado aqui e enviado no campo escondido: o banco guarda só reais.
 */
function CampoEncargo({
  id,
  entrada,
  mudar,
  rotulo,
  rotuloPercentual,
  calcular,
  explicar,
  erro,
  ajuda,
}: {
  id: string;
  entrada: Entrada;
  mudar: (e: Entrada) => void;
  rotulo: string;
  rotuloPercentual: string;
  /** Converte o percentual digitado em reais. */
  calcular: (percentual: number) => number;
  /** Texto curto mostrando a conta, como "2% de R$ 150,00". */
  explicar: (percentual: number) => string;
  erro?: string;
  ajuda?: React.ReactNode;
}) {
  const { modo, texto } = entrada;
  const numero = lerValor(texto);
  const reais = emReais(entrada, calcular);
  // Inválido segue como digitado, para o servidor apontar o erro.
  const enviado = texto.trim() === "" ? "" : reais === null ? texto : formatarNumero(reais);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2">
        <label htmlFor={`${id}-texto`} className="text-sm font-semibold">
          {modo === "reais" ? rotulo : rotuloPercentual}
        </label>
        {ajuda}
      </span>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {modo === "reais" ? "R$" : "%"}
          </span>
          <input
            id={`${id}-texto`}
            inputMode="decimal"
            autoComplete="off"
            placeholder={modo === "reais" ? "0,00" : "0"}
            value={texto}
            onChange={(e) => mudar({ modo, texto: e.target.value })}
            aria-invalid={Boolean(erro)}
            className={`min-h-11 w-full rounded-lg border bg-surface pl-10 pr-3 text-right tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              erro ? "border-neg" : "border-line"
            }`}
          />
        </div>
        <fieldset className="flex shrink-0 rounded-lg border border-line p-0.5">
          <legend className="sr-only">Informar {rotulo.toLowerCase()} em</legend>
          {(["reais", "percentual"] as const).map((m) => (
            <label
              key={m}
              className={`flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-md px-2 text-sm font-semibold ${
                modo === m ? "bg-fg text-bg" : "text-muted"
              }`}
            >
              <input
                type="radio"
                name={`${id}-modo`}
                value={m}
                checked={modo === m}
                onChange={() => mudar({ modo: m, texto: "" })}
                className="sr-only"
              />
              {m === "reais" ? "R$" : "%"}
            </label>
          ))}
        </fieldset>
      </div>
      <input type="hidden" name={id} value={enviado} />
      {modo === "percentual" && numero !== null && numero > 0 && reais !== null && (
        <p className="text-sm text-muted">
          {explicar(numero)} = <span className="font-semibold text-fg">{formatarMoeda(reais)}</span>
        </p>
      )}
      {erro && <p className="text-sm text-neg">{erro}</p>}
    </div>
  );
}

const pct = (n: number) => `${formatarNumero(n).replace(/,00$/, "")}%`;

export function FormQuitar({
  id,
  valor,
  vencimento,
  hoje,
  transferencia,
  textoBotao,
  voltar,
}: {
  id: string;
  valor: number;
  vencimento: string;
  hoje: string;
  transferencia: boolean;
  textoBotao: string;
  voltar: string;
}) {
  const [estado, acao, salvando] = useActionState(quitarLancamento, {} as EstadoQuitar);
  const [dataPagamento, setDataPagamento] = useState(hoje);
  const e = estado.erros ?? {};
  const dias = dataValida(dataPagamento) ? diasDeAtraso(vencimento, dataPagamento) : 0;

  const [multa, setMulta] = useState<Entrada>(VAZIO);
  const [juros, setJuros] = useState<Entrada>(VAZIO);
  const [desconto, setDesconto] = useState<Entrada>(VAZIO);
  const calcMulta = (p: number) => valorDoPercentual(valor, p);
  const calcJuros = (p: number) => jurosAoMes(valor, p, dias);
  const calcDesconto = (p: number) => valorDoPercentual(valor, p);
  const efetivo = valorEfetivo(
    valor,
    emReais(juros, calcJuros) ?? 0,
    emReais(multa, calcMulta) ?? 0,
    emReais(desconto, calcDesconto) ?? 0,
  );
  const ajustado = efetivo !== valor;

  return (
    <form action={acao} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="voltar" value={voltar} />
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2">
          <label htmlFor="data_pagamento" className="text-sm font-semibold">
            Data do pagamento
          </label>
          <Ajuda titulo="Data do pagamento">
            O dia em que o dinheiro saiu ou entrou de fato. Pode ser diferente do vencimento: a
            diferença em dias é usada no cálculo dos juros em %.
          </Ajuda>
        </span>
        <input
          id="data_pagamento"
          name="data_pagamento"
          type="date"
          value={dataPagamento}
          onChange={(ev) => setDataPagamento(ev.target.value)}
          max={hoje}
          min="2000-01-01"
          aria-invalid={Boolean(e.data)}
          className={`min-h-11 rounded-lg border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            e.data ? "border-neg" : "border-line"
          }`}
        />
        {e.data && <p className="text-sm text-neg">{e.data}</p>}
        {dias > 0 && (
          <p className="text-sm text-muted">
            {dias} {dias === 1 ? "dia" : "dias"} de atraso.
          </p>
        )}
      </div>

      {!transferencia && (
        <details open={Boolean(e.juros || e.multa || e.desconto) || undefined} className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold text-accent">
            Juros, multa ou desconto
            {ajustado && <span className="font-normal text-muted"> · valor ajustado</span>}
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            <CampoEncargo
              id="multa"
              entrada={multa}
              mudar={setMulta}
              rotulo="Multa"
              rotuloPercentual="Multa (% do valor)"
              calcular={calcMulta}
              explicar={(p) => `${pct(p)} de ${formatarMoeda(valor)}`}
              erro={e.multa}
              ajuda={
                <Ajuda titulo="Multa">
                  Valor fixo cobrado pelo atraso. Em % (o mais comum é 2%), é calculada sobre o valor
                  original.
                </Ajuda>
              }
            />
            <CampoEncargo
              id="juros"
              entrada={juros}
              mudar={setJuros}
              rotulo="Juros"
              rotuloPercentual="Juros (% ao mês)"
              calcular={calcJuros}
              explicar={(p) => `${pct(p)} ao mês × ${dias} ${dias === 1 ? "dia" : "dias"}`}
              erro={e.juros}
              ajuda={
                <Ajuda titulo="Juros">
                  Cobrados pelos dias de atraso. Em %, informe a taxa ao mês (o mais comum é 1%): o
                  Sobra Vida calcula proporcional aos dias entre o vencimento e o pagamento, como nos
                  boletos.
                </Ajuda>
              }
            />
            <CampoEncargo
              id="desconto"
              entrada={desconto}
              mudar={setDesconto}
              rotulo="Desconto"
              rotuloPercentual="Desconto (% do valor)"
              calcular={calcDesconto}
              explicar={(p) => `${pct(p)} de ${formatarMoeda(valor)}`}
              erro={e.desconto}
              ajuda={<Ajuda titulo="Desconto">Abatimento por pagar antes ou à vista.</Ajuda>}
            />
          </div>
        </details>
      )}

      <p className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-bg p-3" aria-live="polite">
        <span className="text-sm font-semibold text-muted">Valor {transferencia ? "transferido" : "pago"}</span>
        <span className="font-display text-xl font-bold tabular-nums">{formatarMoeda(efetivo)}</span>
      </p>

      <AvisoErro mensagem={estado.mensagem} />
      <Botao type="submit" disabled={salvando}>
        {salvando ? "Salvando…" : textoBotao}
      </Botao>
    </form>
  );
}
