"use client";

import Link from "next/link";
import { useState } from "react";
import { formatarNumero } from "@/lib/dinheiro";
import { media, type LinhaDre } from "@/lib/relatorios";
import { linkDetalhe } from "./links";

/** Número sem "R$" (a tabela é larga); zero vira um traço discreto. */
export function Celula({ valor, forte = false, sinal = false, discreto = false, href }: {
  valor: number;
  forte?: boolean;
  sinal?: boolean;
  discreto?: boolean;
  /** Tocar no valor abre os lançamentos que o formam. */
  href?: string;
}) {
  if (valor === 0) return <td className="px-2 py-1.5 text-right text-muted">—</td>;
  const cor = sinal ? (valor < 0 ? "text-neg" : "text-pos") : discreto ? "text-muted" : "";
  return (
    <td className={`whitespace-nowrap px-2 py-1.5 text-right tabular-nums ${forte ? "font-semibold" : ""} ${cor}`}>
      {href ? (
        <Link href={href} className="underline decoration-line decoration-dotted underline-offset-4 hover:text-accent hover:decoration-accent">
          {formatarNumero(valor)}
        </Link>
      ) : (
        formatarNumero(valor)
      )}
    </td>
  );
}


/** Grupo da DRE; tocar no nome abre as categorias logo abaixo. */
export function LinhaGrupo({ g, mesesMedia, base }: { g: LinhaDre; mesesMedia: number; base: string }) {
  const [aberto, setAberto] = useState(false);
  const id = `cats-${g.grupo.replace(/\W+/g, "-")}`;
  return (
    <>
      <tr className="border-t border-line">
        <th scope="row" className="sticky left-0 max-w-56 bg-surface px-2 py-1.5 text-left font-normal">
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            aria-expanded={aberto}
            aria-controls={id}
            className="flex min-h-8 max-w-full items-center gap-1.5 text-left hover:text-accent"
            title={g.grupo}
          >
            <span aria-hidden className={`inline-block w-3 text-xs text-muted transition-transform ${aberto ? "rotate-90" : ""}`}>
              ▶
            </span>
            <span className="truncate">{g.grupo}</span>
            <span className="sr-only">{aberto ? " (fechar categorias)" : " (ver categorias)"}</span>
          </button>
        </th>
        {g.meses.map((v, i) => (
          <Celula key={i} valor={v} href={linkDetalhe(base, i + 1, g.grupo)} />
        ))}
        <Celula valor={g.total} forte />
        <Celula valor={media(g.total, mesesMedia)} />
      </tr>
      {aberto &&
        g.categorias.map((c, n) => (
          <tr key={c.nome} id={n === 0 ? id : undefined} className="text-xs">
            <th scope="row" className="sticky left-0 max-w-56 truncate bg-surface py-1 pl-8 pr-2 text-left font-normal text-muted" title={c.nome}>
              {c.nome}
            </th>
            {c.meses.map((v, i) => (
              <Celula key={i} valor={v} discreto href={linkDetalhe(base, i + 1, g.grupo, c.nome)} />
            ))}
            <Celula valor={c.total} discreto />
            <Celula valor={media(c.total, mesesMedia)} discreto />
          </tr>
        ))}
    </>
  );
}
