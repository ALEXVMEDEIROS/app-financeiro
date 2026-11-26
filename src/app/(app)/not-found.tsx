import Link from "next/link";

// Aparece quando o endereço não existe ou o registro não é seu (a proteção por
// usuário faz o registro de outra pessoa simplesmente não ser encontrado).
export default function NaoEncontrado() {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Não encontramos esta página</h1>
      <p className="text-muted">
        O endereço pode estar errado, ou o item foi excluído. Seus dados continuam seguros.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/lancamentos" className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 font-semibold text-bg">
          Ir para Lançamentos
        </Link>
        <Link
          href="/contas"
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 font-semibold"
        >
          Ir para Contas
        </Link>
      </div>
    </div>
  );
}
