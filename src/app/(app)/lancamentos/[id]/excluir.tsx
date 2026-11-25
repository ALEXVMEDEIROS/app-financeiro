"use client";

import { useActionState, useState } from "react";
import { AvisoErro } from "@/components/campo";
import { Botao } from "@/components/ui/botao";
import { excluirLancamento, type EstadoExcluirLancamento } from "../acoes";

export type ResumoParcelas = {
  numero: number;
  total: number;
  /** Quantas existem a partir desta (inclusive) e no grupo inteiro. */
  seguintes: number;
  todas: number;
  /** Quantas já pagas em cada alcance, para avisar antes. */
  pagasSeguintes: number;
  pagasTodas: number;
};

type Alcance = "esta" | "seguintes" | "todas";

/** Exclusão em dois passos; numa parcela, pergunta o alcance. */
export function ExcluirLancamento({
  id,
  voltar,
  parcelas,
}: {
  id: string;
  voltar: string;
  parcelas?: ResumoParcelas;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [alcance, setAlcance] = useState<Alcance>("esta");
  const [estado, acao, excluindo] = useActionState(excluirLancamento, {} as EstadoExcluirLancamento);

  if (!confirmando) {
    return (
      <Botao variante="secundario" onClick={() => setConfirmando(true)}>
        Excluir lançamento
      </Botao>
    );
  }

  const quantas = !parcelas ? 1 : alcance === "todas" ? parcelas.todas : alcance === "seguintes" ? parcelas.seguintes : 1;
  const pagas = !parcelas ? 0 : alcance === "todas" ? parcelas.pagasTodas : alcance === "seguintes" ? parcelas.pagasSeguintes : 0;

  return (
    <form action={acao} className="flex flex-col gap-3 rounded-xl border border-neg/40 bg-neg/5 p-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="voltar" value={voltar} />
      <p className="font-semibold">
        {quantas > 1 ? `Excluir ${quantas} parcelas de vez?` : "Excluir este lançamento de vez?"}
      </p>

      {parcelas && (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm text-muted">
            Esta é a parcela {parcelas.numero}/{parcelas.total}. O que excluir?
          </legend>
          {(
            [
              { valor: "esta", rotulo: "Só esta parcela" },
              { valor: "seguintes", rotulo: `Esta e as seguintes (${parcelas.seguintes})` },
              { valor: "todas", rotulo: `A compra inteira (${parcelas.todas})` },
            ] as const
          ).map((o) => (
            <label key={o.valor} className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="alcance"
                value={o.valor}
                checked={alcance === o.valor}
                onChange={() => setAlcance(o.valor)}
                className="h-5 w-5 accent-[var(--accent)]"
              />
              <span className="font-semibold">{o.rotulo}</span>
            </label>
          ))}
        </fieldset>
      )}

      <p className="text-sm text-muted">
        Não dá para desfazer. Os saldos das contas são recalculados sem {quantas > 1 ? "esses lançamentos" : "ele"}.
        {pagas > 0 && (
          <strong className="text-neg">
            {" "}
            {pagas === 1 ? "1 delas já está paga" : `${pagas} delas já estão pagas`} e também sai do histórico.
          </strong>
        )}
      </p>
      <AvisoErro mensagem={estado.mensagem} />
      <div className="flex flex-wrap gap-3">
        <Botao type="submit" variante="perigo" disabled={excluindo}>
          {excluindo ? "Excluindo…" : quantas > 1 ? `Sim, excluir ${quantas}` : "Sim, excluir"}
        </Botao>
        <Botao variante="secundario" onClick={() => setConfirmando(false)}>
          Não excluir
        </Botao>
      </div>
    </form>
  );
}
