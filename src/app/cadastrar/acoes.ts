"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type EstadoCadastro = {
  status: "inicial" | "erro" | "enviado";
  mensagem?: string;
  erros?: { nome?: string; email?: string; senha?: string; confirmacao?: string };
  valores?: { nome: string; email: string };
  emailEnviado?: string;
};

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function cadastrar(
  _anterior: EstadoCadastro,
  formData: FormData,
): Promise<EstadoCadastro> {
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  const erros: EstadoCadastro["erros"] = {};
  if (nome.length === 0) erros.nome = "Informe seu nome.";
  else if (nome.length > 120) erros.nome = "Use no máximo 120 caracteres.";
  if (!EMAIL_VALIDO.test(email)) erros.email = "Informe um e-mail válido, como nome@exemplo.com.";
  if (senha.length < 8) erros.senha = "A senha precisa ter pelo menos 8 caracteres.";
  else if (senha.length > 72) erros.senha = "Use no máximo 72 caracteres.";
  if (confirmacao !== senha) erros.confirmacao = "As duas senhas não são iguais.";

  if (Object.keys(erros).length > 0) {
    return { status: "erro", erros, valores: { nome, email } };
  }

  const cabecalhos = await headers();
  const origem =
    cabecalhos.get("origin") ??
    `https://${cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome },
      emailRedirectTo: `${origem}/auth/confirmar`,
    },
  });

  if (error) {
    const texto = error.message.toLowerCase();
    let mensagem = "Não foi possível criar a conta agora. Tente de novo em alguns minutos.";
    if (texto.includes("rate limit") || error.status === 429) {
      mensagem =
        "Muitas tentativas de cadastro em pouco tempo. Espere alguns minutos e tente de novo.";
    } else if (texto.includes("password")) {
      mensagem = "Essa senha não foi aceita. Use uma senha mais longa, misturando letras e números.";
    } else if (texto.includes("email")) {
      mensagem = "Esse e-mail não foi aceito. Confira se está escrito certo.";
    }
    return { status: "erro", mensagem, valores: { nome, email } };
  }

  // Por segurança, a resposta é a mesma para e-mail novo e para e-mail já
  // cadastrado: assim ninguém descobre quem tem conta no Sobra Vida.
  return { status: "enviado", emailEnviado: email };
}
