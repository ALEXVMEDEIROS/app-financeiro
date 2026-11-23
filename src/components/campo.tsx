// Campo de formulário com rótulo, erro e dica, usado nas telas de conta.
export function Campo({
  id,
  rotulo,
  tipo = "text",
  autoComplete,
  valorInicial,
  erro,
  dica,
}: {
  id: string;
  rotulo: string;
  tipo?: string;
  autoComplete: string;
  valorInicial?: string;
  erro?: string;
  dica?: string;
}) {
  const idAjuda = `${id}-ajuda`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {rotulo}
      </label>
      <input
        id={id}
        name={id}
        type={tipo}
        autoComplete={autoComplete}
        defaultValue={valorInicial}
        required
        aria-invalid={Boolean(erro)}
        aria-describedby={erro || dica ? idAjuda : undefined}
        className={`rounded-lg border bg-surface px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          erro ? "border-neg" : "border-line"
        }`}
      />
      {(erro || dica) && (
        <p id={idAjuda} className={`text-sm ${erro ? "text-neg" : "text-muted"}`}>
          {erro ?? dica}
        </p>
      )}
    </div>
  );
}

export function AvisoErro({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null;
  return (
    <p className="rounded-lg bg-neg/10 px-3 py-2 text-sm text-neg" role="alert">
      {mensagem}
    </p>
  );
}

export function BotaoEnviar({ enviando, texto, textoEnviando }: { enviando: boolean; texto: string; textoEnviando: string }) {
  return (
    <button
      type="submit"
      disabled={enviando}
      className="mt-2 rounded-lg bg-accent px-4 py-3 font-semibold text-bg transition-opacity disabled:opacity-60"
    >
      {enviando ? textoEnviando : texto}
    </button>
  );
}

// Só aceita destinos dentro do próprio site.
export function destinoSeguro(valor: string | null | undefined, padrao = "/painel") {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) {
    return padrao;
  }
  return valor;
}
