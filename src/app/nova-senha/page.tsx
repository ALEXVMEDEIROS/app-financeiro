"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AvisoErro, BotaoEnviar, Campo } from "@/components/campo";
import { definirNovaSenha, type EstadoNovaSenha } from "./acoes";

// Protegida pelo proxy: só abre com a sessão criada pelo link de recuperação.
export default function PaginaNovaSenha() {
  const [estado, acao, enviando] = useActionState(definirNovaSenha, {} as EstadoNovaSenha);

  return (
    <main className="flex flex-1 items-center px-4 py-12">
      <title>Nova senha · Sobra Vida</title>
      <meta name="robots" content="noindex, nofollow" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="font-display text-lg font-extrabold tracking-tight">
            Sobra Vida
          </Link>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Criar senha nova</h1>
        </div>
        <form action={acao} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
          <Campo id="senha" rotulo="Senha nova" tipo="password" autoComplete="new-password" erro={estado.erros?.senha} dica="Pelo menos 8 caracteres." />
          <Campo id="confirmacao" rotulo="Repita a senha nova" tipo="password" autoComplete="new-password" erro={estado.erros?.confirmacao} />
          <AvisoErro mensagem={estado.mensagem} />
          <BotaoEnviar enviando={enviando} texto="Salvar senha nova" textoEnviando="Salvando…" />
        </form>
      </div>
    </main>
  );
}
