"use client";

import { useState } from "react";
import { formatarNumero } from "@/lib/dinheiro";
import { media, type LinhaDre } from "@/lib/relatorios";

/** Número sem "R$" (a tabela é larga); zero vira um traço discreto. */
export function Celula({ valor, forte = false, sinal = false, discreto = false }: {
  valor: number;
  forte?: boolean;
  sinal?: boolean;
  discreto?: boolean;
}) {
  if (valor === 0) return <td className="px-2 py-1.5 text-right text-muted">—</td>;
  const cor = sinal ? (valor < 0 ? "text-neg" : "text-pos") : discreto ? "text-muted" : "";
  return (
    <td className={`whitespace-nowrap px-2 py-1.5 text-right tabular-nums ${forte ? "font-semibold" : ""} ${cor}`}>
      {formatarNumero(valor)}
    </td>
  );
}

/** Grupo da DRE; tocar no nome abre as categorias logo abaixo. */
export function LinhaGrupo({ g, mesesMedia }: { g: LinhaDre; mesesMedia: number }) {
  const [aberto, setAberto] = useState(false);
  const id = `cats-${g.grupo.replace(/\W+/g, "-")}`;
  return (
    <>
      <tr className="border-t border-line">
        <th scope="row" className="sticky left-0 bg-surface px-2 py-1.5 text-left font-normal">
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            aria-expanded={aberto}
            aria-controls={id}
            className="flex min-h-8 items-center gap-1.5 text-left hover:text-accent"
          >
            <span aria-hidden className={`inline-block w-3 text-xs text-muted transition-transform ${aberto ? "rotate-90" : ""}`}>
              ▶
            </span>
            {g.grupo}
            <span className="sr-only">{aberto ? " (fechar categorias)" : " (ver categorias)"}</span>
          </button>
        </th>
        {g.meses.map((v, i) => (
          <Celula key={i} valor={v} />
        ))}
        <Celula valor={g.total} forte />
        <Celula valor={media(g.total, mesesMedia)} />
      </tr>
      {aberto &&
        g.categorias.map((c, n) => (
          <tr key={c.nome} id={n === 0 ? id : undefined} className="text-xs">
            <th scope="row" className="sticky left-0 bg-surface py-1 pl-8 pr-2 text-left font-normal text-muted">
              {c.nome}
            </th>
            {c.meses.map((v, i) => (
              <Celula key={i} valor={v} discreto />
            ))}
            <Celula valor={c.total} discreto />
            <Celula valor={media(c.total, mesesMedia)} discreto />
          </tr>
        ))}
    </>
  );
}
