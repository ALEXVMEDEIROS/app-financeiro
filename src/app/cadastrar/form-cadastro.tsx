"use client";

import { useActionState } from "react";
import { cadastrar, type EstadoCadastro } from "./acoes";

const estadoInicial: EstadoCadastro = { status: "inicial" };

function Campo({
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

export function FormCadastro() {
  const [estado, acao, enviando] = useActionState(cadastrar, estadoInicial);

  if (estado.status === "enviado") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6" role="status">
        <h2 className="font-display text-xl font-extrabold">Confira seu e-mail</h2>
        <p className="text-muted">
          Enviamos um link de confirmação para <strong className="text-fg">{estado.emailEnviado}</strong>.
          Abra o e-mail e clique no link para ativar sua conta.
        </p>
        <p className="text-sm text-muted">
          Não chegou em alguns minutos? Veja a caixa de spam ou lixo eletrônico.
        </p>
      </div>
    );
  }

  return (
    <form action={acao} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
      <Campo
        id="nome"
        rotulo="Seu nome"
        autoComplete="name"
        valorInicial={estado.valores?.nome}
        erro={estado.erros?.nome}
      />
      <Campo
        id="email"
        rotulo="E-mail"
        tipo="email"
        autoComplete="email"
        valorInicial={estado.valores?.email}
        erro={estado.erros?.email}
      />
      <Campo
        id="senha"
        rotulo="Senha"
        tipo="password"
        autoComplete="new-password"
        erro={estado.erros?.senha}
        dica="Pelo menos 8 caracteres."
      />
      <Campo
        id="confirmacao"
        rotulo="Repita a senha"
        tipo="password"
        autoComplete="new-password"
        erro={estado.erros?.confirmacao}
      />

      {estado.mensagem && (
        <p className="rounded-lg bg-neg/10 px-3 py-2 text-sm text-neg" role="alert">
          {estado.mensagem}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-2 rounded-lg bg-accent px-4 py-3 font-semibold text-bg transition-opacity disabled:opacity-60"
      >
        {enviando ? "Criando a conta…" : "Criar conta"}
      </button>
    </form>
  );
}
