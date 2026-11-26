"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { criarCategoria, criarGrupo, renomear, type EstadoNome } from "./acoes";

const campo =
  "min-h-11 min-w-0 flex-1 rounded-lg border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-accent";
const botao = "inline-flex min-h-11 shrink-0 items-center rounded-lg px-4 font-semibold disabled:opacity-60";

/** Campo de nome + botão; usado para criar e renomear. Fecha sozinho quando dá certo. */
function FormNome({
  acao,
  ocultos,
  valorInicial = "",
  rotulo,
  textoBotao,
  aoTerminar,
  limparAoSalvar = false,
}: {
  acao: (anterior: EstadoNome, formData: FormData) => Promise<EstadoNome>;
  ocultos: Record<string, string>;
  valorInicial?: string;
  rotulo: string;
  textoBotao: string;
  aoTerminar?: () => void;
  limparAoSalvar?: boolean;
}) {
  const [estado, enviar, salvando] = useActionState(acao, {});
  const form = useRef<HTMLFormElement>(null);
  const tratado = useRef<number | undefined>(undefined);

  // Reage uma vez a cada salvamento bem-sucedido ("ok" muda a cada vez).
  useEffect(() => {
    if (!estado.ok || tratado.current === estado.ok) return;
    tratado.current = estado.ok;
    if (limparAoSalvar) form.current?.reset();
    aoTerminar?.();
  }, [estado.ok, limparAoSalvar, aoTerminar]);

  return (
    <form ref={form} action={enviar} noValidate className="flex flex-col gap-1.5">
      {Object.entries(ocultos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      <label className="sr-only" htmlFor={`nome-${Object.values(ocultos).join("-")}`}>
        {rotulo}
      </label>
      <div className="flex gap-2">
        <input
          id={`nome-${Object.values(ocultos).join("-")}`}
          name="nome"
          defaultValue={valorInicial}
          maxLength={60}
          autoComplete="off"
          placeholder={rotulo}
          aria-invalid={Boolean(estado.erro)}
          className={`${campo} ${estado.erro ? "border-neg" : "border-line"}`}
        />
        <button type="submit" disabled={salvando} className={`${botao} bg-accent text-bg`}>
          {salvando ? "…" : textoBotao}
        </button>
      </div>
      {estado.erro && (
        <p className="text-sm text-neg" role="alert">
          {estado.erro}
        </p>
      )}
    </form>
  );
}

/** Nome com botão "Renomear" que troca por um campo de edição. */
export function NomeEditavel({
  id,
  tabela,
  nome,
  className = "",
}: {
  id: string;
  tabela: "grupos" | "categorias";
  nome: string;
  className?: string;
}) {
  const [editando, setEditando] = useState(false);
  if (editando) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <FormNome
          acao={renomear}
          ocultos={{ id, tabela }}
          valorInicial={nome}
          rotulo={tabela === "grupos" ? "Nome do grupo" : "Nome da categoria"}
          textoBotao="Salvar"
          aoTerminar={() => setEditando(false)}
        />
        <button type="button" onClick={() => setEditando(false)} className="self-start text-sm font-semibold text-muted">
          Cancelar
        </button>
      </div>
    );
  }
  return (
    <span className={`flex min-w-0 items-baseline gap-2 ${className}`}>
      <span className="truncate">{nome}</span>
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="shrink-0 text-xs font-semibold text-accent underline-offset-4 hover:underline"
        aria-label={`Renomear ${nome}`}
      >
        Renomear
      </button>
    </span>
  );
}

/** "+ Nova categoria" dentro de um grupo; o campo continua aberto para criar várias seguidas. */
export function NovaCategoria({ grupoId }: { grupoId: string }) {
  const [aberto, setAberto] = useState(false);
  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="self-start text-sm font-semibold text-accent">
        + Nova categoria
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <FormNome
        acao={criarCategoria}
        ocultos={{ grupo_id: grupoId }}
        rotulo="Nome da nova categoria"
        textoBotao="Criar"
        limparAoSalvar
      />
      <button type="button" onClick={() => setAberto(false)} className="self-start text-sm font-semibold text-muted">
        Fechar
      </button>
    </div>
  );
}

/** "+ Novo grupo" no fim da aba. */
export function NovoGrupo({ natureza }: { natureza: "receita" | "despesa" }) {
  const [aberto, setAberto] = useState(false);
  const fechar = () => setAberto(false);
  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex min-h-11 items-center self-start rounded-lg border border-line bg-surface px-4 font-semibold hover:border-muted"
      >
        + Novo grupo de {natureza}
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-3">
      <p className="text-sm font-semibold">Novo grupo de {natureza}</p>
      <FormNome acao={criarGrupo} ocultos={{ natureza }} rotulo="Nome do grupo" textoBotao="Criar" aoTerminar={fechar} />
      <button type="button" onClick={fechar} className="self-start text-sm font-semibold text-muted">
        Cancelar
      </button>
    </div>
  );
}
