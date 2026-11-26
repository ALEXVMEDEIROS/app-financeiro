"use client";

import Link from "next/link";
import { useEffect } from "react";

// Erro inesperado numa tela da área logada (por exemplo, conexão caiu no meio
// de um salvamento). Mostra um texto em português e um caminho de volta; o
// detalhe técnico fica só no console do navegador.
export default function ErroDaTela({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex max-w-xl flex-col gap-4" role="alert">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Algo deu errado</h1>
      <p className="text-muted">
        Não conseguimos carregar ou salvar agora. Confira sua conexão com a internet e tente de novo.
        Se você estava salvando algo, confira na lista se foi gravado antes de repetir.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 font-semibold text-bg"
        >
          Tentar de novo
        </button>
        <Link
          href="/lancamentos"
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 font-semibold"
        >
          Ir para Lançamentos
        </Link>
      </div>
      {error.digest && <p className="text-xs text-muted">Código do erro: {error.digest}</p>}
    </div>
  );
}
