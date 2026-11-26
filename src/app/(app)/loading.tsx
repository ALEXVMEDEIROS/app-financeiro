// Aparece na hora ao trocar de tela, enquanto os dados chegam (conexão lenta).
export default function Carregando() {
  return (
    <div className="flex max-w-3xl flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="h-9 w-48 animate-pulse rounded-lg bg-line" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-16 animate-pulse rounded-xl bg-line" />
        <div className="h-16 animate-pulse rounded-xl bg-line" />
        <div className="h-16 animate-pulse rounded-xl bg-line" />
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-line" />
    </div>
  );
}
