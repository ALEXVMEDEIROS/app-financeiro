import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4">
      <p className="font-display text-xl font-extrabold">Sobra Vida</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Não encontramos esta página</h1>
      <p className="text-muted">O endereço pode estar errado ou a página mudou de lugar.</p>
      <Link href="/" className="inline-flex min-h-11 items-center self-start rounded-lg bg-accent px-4 font-semibold text-bg">
        Voltar ao início
      </Link>
    </main>
  );
}
