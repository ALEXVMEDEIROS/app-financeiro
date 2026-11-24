"use client";

import { useEffect, useId, useRef, useState } from "react";

// Balão de ajuda "(?)" ao lado de um rótulo (sugestão do testador André Vianna).
// Abre e fecha com clique, toque ou teclado; fecha com Esc ou clicando fora.
export function Ajuda({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const caixa = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function fecharFora(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    }
    function fecharEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharEsc);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharEsc);
    };
  }, [aberto]);

  return (
    <span ref={caixa} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`Ajuda: ${titulo}`}
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((v) => !v)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line text-xs font-bold text-muted hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        ?
      </button>
      {aberto && (
        <span
          id={id}
          role="note"
          className="absolute left-0 top-8 z-20 w-64 max-w-[80vw] rounded-lg border border-line bg-surface p-3 text-sm font-normal text-fg shadow-lg"
        >
          <strong className="mb-1 block">{titulo}</strong>
          {children}
        </span>
      )}
    </span>
  );
}
