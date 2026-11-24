"use client";

import { useState } from "react";
import { formatarNumero, lerValor } from "@/lib/dinheiro";

// Campos de formulário da F2. Todos com rótulo, erro ligado ao campo e
// altura mínima de 44 px. O rótulo pode trazer um balão de ajuda (<Ajuda>).

const estiloCampo = (erro?: string) =>
  `min-h-11 w-full rounded-lg border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
    erro ? "border-neg" : "border-line"
  }`;

function Rotulo({ id, rotulo, ajuda }: { id: string; rotulo: string; ajuda?: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {rotulo}
      </label>
      {ajuda}
    </span>
  );
}

function Mensagem({ id, erro, dica }: { id: string; erro?: string; dica?: string }) {
  if (!erro && !dica) return null;
  return (
    <p id={`${id}-ajuda`} className={`text-sm ${erro ? "text-neg" : "text-muted"}`}>
      {erro ?? dica}
    </p>
  );
}

/** Valor em reais: aceita "1.234,56" e formata ao sair do campo. */
export function CampoValor({
  id,
  rotulo,
  valorInicial,
  erro,
  dica,
  ajuda,
}: {
  id: string;
  rotulo: string;
  valorInicial?: number;
  erro?: string;
  dica?: string;
  ajuda?: React.ReactNode;
}) {
  const [texto, setTexto] = useState(valorInicial != null ? formatarNumero(valorInicial) : "");
  return (
    <div className="flex flex-col gap-1.5">
      <Rotulo id={id} rotulo={rotulo} ajuda={ajuda} />
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">R$</span>
        <input
          id={id}
          name={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => {
            const v = lerValor(texto);
            if (v != null) setTexto(formatarNumero(v));
          }}
          aria-invalid={Boolean(erro)}
          aria-describedby={erro || dica ? `${id}-ajuda` : undefined}
          className={`${estiloCampo(erro)} pl-10 text-right font-display text-lg font-bold tabular-nums`}
        />
      </div>
      <Mensagem id={id} erro={erro} dica={dica} />
    </div>
  );
}

/** Data (AAAA-MM-DD), com o calendário do próprio aparelho. */
export function CampoData({
  id,
  rotulo,
  valorInicial,
  erro,
  dica,
  ajuda,
}: {
  id: string;
  rotulo: string;
  valorInicial?: string;
  erro?: string;
  dica?: string;
  ajuda?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Rotulo id={id} rotulo={rotulo} ajuda={ajuda} />
      <input
        id={id}
        name={id}
        type="date"
        defaultValue={valorInicial}
        min="2000-01-01"
        max="2100-12-31"
        aria-invalid={Boolean(erro)}
        aria-describedby={erro || dica ? `${id}-ajuda` : undefined}
        className={estiloCampo(erro)}
      />
      <Mensagem id={id} erro={erro} dica={dica} />
    </div>
  );
}

export type GrupoDeOpcoes = { grupo: string; opcoes: { valor: string; rotulo: string }[] };

/** Lista de escolha com opções agrupadas (ex.: categorias por grupo). */
export function SelecaoAgrupada({
  id,
  rotulo,
  grupos,
  valorInicial,
  vazio = "Escolha…",
  erro,
  dica,
  ajuda,
}: {
  id: string;
  rotulo: string;
  grupos: GrupoDeOpcoes[];
  valorInicial?: string;
  vazio?: string;
  erro?: string;
  dica?: string;
  ajuda?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Rotulo id={id} rotulo={rotulo} ajuda={ajuda} />
      <select
        id={id}
        name={id}
        defaultValue={valorInicial ?? ""}
        aria-invalid={Boolean(erro)}
        aria-describedby={erro || dica ? `${id}-ajuda` : undefined}
        className={estiloCampo(erro)}
      >
        <option value="" disabled>
          {vazio}
        </option>
        {grupos.map((g) =>
          g.grupo ? (
            <optgroup key={g.grupo} label={g.grupo}>
              {g.opcoes.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </optgroup>
          ) : (
            g.opcoes.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))
          ),
        )}
      </select>
      <Mensagem id={id} erro={erro} dica={dica} />
    </div>
  );
}
