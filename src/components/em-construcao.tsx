// Aviso das telas que ainda vão ser construídas na F2.
export function EmConstrucao({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{titulo}</h1>
      <div className="rounded-xl border border-dashed border-line bg-surface p-5">
        <p className="font-semibold">Em construção</p>
        <p className="text-muted">{texto}</p>
      </div>
    </div>
  );
}
