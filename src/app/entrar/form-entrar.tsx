"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AvisoErro, BotaoEnviar, Campo } from "@/components/campo";
import { entrar, type EstadoEntrar } from "./acoes";

export function FormEntrar({ proxima }: { proxima: string }) {
  const [estado, acao, enviando] = useActionState(entrar, {} as EstadoEntrar);

  return (
    <form action={acao} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
      <input type="hidden" name="proxima" value={proxima} />
      <Campo id="email" rotulo="E-mail" tipo="email" autoComplete="email" valorInicial={estado.email} />
      <Campo id="senha" rotulo="Senha" tipo="password" autoComplete="current-password" />
      <Link
        href="/recuperar-senha"
        className="-mt-2 self-end text-sm font-semibold text-accent underline-offset-4 hover:underline"
      >
        Esqueci a senha
      </Link>
      <AvisoErro mensagem={estado.mensagem} />
      <BotaoEnviar enviando={enviando} texto="Entrar" textoEnviando="Entrando…" />
    </form>
  );
}
