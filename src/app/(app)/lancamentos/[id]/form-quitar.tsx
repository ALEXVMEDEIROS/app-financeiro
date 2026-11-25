"use client";

import { useActionState, useState } from "react";
import { AvisoErro } from "@/components/campo";
import { Ajuda } from "@/components/ui/ajuda";
import { Botao } from "@/components/ui/botao";
import { CampoValor } from "@/components/ui/campos";
import { formatarMoeda } from "@/lib/dinheiro";
import { valorEfetivo } from "@/lib/parcelas";
import { quitarLancamento, type EstadoQuitar } from "../quitar";

export function FormQuitar({
  id,
  valor,
  hoje,
  transferencia,
  textoBotao,
  voltar,
}: {
  id: string;
  valor: number;
  hoje: string;
  transferencia: boolean;
  textoBotao: string;
  voltar: string;
}) {
  const [estado, acao, salvando] = useActionState(quitarLancamento, {} as EstadoQuitar);
  const [juros, setJuros] = useState<number | null>(0);
  const [multa, setMulta] = useState<number | null>(0);
  const [desconto, setDesconto] = useState<number | null>(0);
  const e = estado.erros ?? {};
  const efetivo = valorEfetivo(valor, juros ?? 0, multa ?? 0, desconto ?? 0);
  const ajustado = efetivo !== valor;

  return (
    <form action={acao} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="voltar" value={voltar} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="data_pagamento" className="text-sm font-semibold">
          Data do pagamento
        </label>
        <input
          id="data_pagamento"
          name="data_pagamento"
          type="date"
          defaultValue={hoje}
          max={hoje}
          min="2000-01-01"
          aria-invalid={Boolean(e.data)}
          className={`min-h-11 rounded-lg border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            e.data ? "border-neg" : "border-line"
          }`}
        />
        {e.data && <p className="text-sm text-neg">{e.data}</p>}
      </div>

      {!transferencia && (
        <details open={Boolean(e.juros || e.multa || e.desconto) || undefined} className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold text-accent">
            Juros, multa ou desconto
            {ajustado && <span className="font-normal text-muted"> · valor ajustado</span>}
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <CampoValor
              id="juros"
              rotulo="Juros"
              erro={e.juros}
              aoMudar={setJuros}
              ajuda={<Ajuda titulo="Juros">Valor cobrado pelos dias de atraso.</Ajuda>}
            />
            <CampoValor id="multa" rotulo="Multa" erro={e.multa} aoMudar={setMulta} />
            <CampoValor
              id="desconto"
              rotulo="Desconto"
              erro={e.desconto}
              aoMudar={setDesconto}
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
