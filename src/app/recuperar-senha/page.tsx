"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AvisoErro, BotaoEnviar, Campo } from "@/components/campo";
import { recuperarSenha, type EstadoRecuperar } from "./acoes";

export default function PaginaRecuperarSenha() {
  const [estado, acao, enviando] = useActionState(recuperarSenha, { status: "inicial" } as EstadoRecuperar);

  return (
    <main className="flex flex-1 items-center px-4 py-12">
      <title>Recuperar senha · Sobra Vida</title>
      <meta name="robots" content="noindex, nofollow" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="font-display text-lg font-extrabold tracking-tight">
            Sobra Vida
          </Link>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Recuperar senha</h1>
          <p className="text-muted">Informe o e-mail da sua conta e enviaremos um link para você criar uma senha nova.</p>
        </div>

        {estado.status === "enviado" ? (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6" role="status">
            <h2 className="font-display text-xl font-extrabold">Confira seu e-mail</h2>
            <p className="text-muted">
              Se houver uma conta com <strong className="text-fg">{estado.email}</strong>, você vai receber
              um link para criar uma senha nova. Abra o e-mail neste mesmo navegador.
            </p>
            <p className="text-sm text-muted">Não chegou? Veja a caixa de spam.</p>
          </div>
        ) : (
          <form action={acao} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
            <Campo id="email" rotulo="E-mail da sua conta" tipo="email" autoComplete="email" valorInicial={estado.email} />
            <AvisoErro mensagem={estado.mensagem} />
            <BotaoEnviar enviando={enviando} texto="Enviar link" textoEnviando="Enviando…" />
          </form>
        )}

        <p className="text-center text-sm text-muted">
          Lembrou a senha?{" "}
          <Link href="/entrar" className="font-semibold text-accent underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
