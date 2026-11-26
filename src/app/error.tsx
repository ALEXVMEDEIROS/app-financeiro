"use client";

import { useEffect } from "react";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4" role="alert">
      <p className="font-display text-xl font-extrabold">Sobra Vida</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Algo deu errado</h1>
      <p className="text-muted">Confira sua conexão com a internet e tente de novo em alguns instantes.</p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-11 items-center self-start rounded-lg bg-accent px-4 font-semibold text-bg"
      >
        Tentar de novo
      </button>
    </main>
  );
}
