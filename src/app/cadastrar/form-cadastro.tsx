"use client";

import { useActionState } from "react";
import { AvisoErro, BotaoEnviar, Campo } from "@/components/campo";
import { cadastrar, type EstadoCadastro } from "./acoes";

const estadoInicial: EstadoCadastro = { status: "inicial" };

export function FormCadastro() {
  const [estado, acao, enviando] = useActionState(cadastrar, estadoInicial);

  if (estado.status === "enviado") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6" role="status">
        <h2 className="font-display text-xl font-extrabold">Confira seu e-mail</h2>
        <p className="text-muted">
          Enviamos um link de confirmação para <strong className="text-fg">{estado.emailEnviado}</strong>.
          Abra o e-mail neste mesmo navegador e clique no link para ativar sua conta.
        </p>
        <p className="text-sm text-muted">
          Não chegou em alguns minutos? Veja a caixa de spam ou lixo eletrônico.
        </p>
      </div>
    );
  }

  return (
    <form action={acao} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
      <Campo id="nome" rotulo="Seu nome" autoComplete="name" valorInicial={estado.valores?.nome} erro={estado.erros?.nome} />
      <Campo id="email" rotulo="E-mail" tipo="email" autoComplete="email" valorInicial={estado.valores?.email} erro={estado.erros?.email} />
      <Campo id="senha" rotulo="Senha" tipo="password" autoComplete="new-password" erro={estado.erros?.senha} dica="Pelo menos 8 caracteres." />
      <Campo id="confirmacao" rotulo="Repita a senha" tipo="password" autoComplete="new-password" erro={estado.erros?.confirmacao} />
      <AvisoErro mensagem={estado.mensagem} />
      <BotaoEnviar enviando={enviando} texto="Criar conta" textoEnviando="Criando a conta…" />
    </form>
  );
}
