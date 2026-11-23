"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EstadoNovaSenha = {
  mensagem?: string;
  erros?: { senha?: string; confirmacao?: string };
};

// Chamada depois que a pessoa clica no link de recuperação: nesse momento ela
// está logada por uma sessão temporária e pode trocar a senha.
export async function definirNovaSenha(
  _anterior: EstadoNovaSenha,
  formData: FormData,
): Promise<EstadoNovaSenha> {
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  const erros: EstadoNovaSenha["erros"] = {};
  if (senha.length < 8) erros.senha = "A senha precisa ter pelo menos 8 caracteres.";
  else if (senha.length > 72) erros.senha = "Use no máximo 72 caracteres.";
  if (confirmacao !== senha) erros.confirmacao = "As duas senhas não são iguais.";
  if (Object.keys(erros).length > 0) return { erros };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });

  if (error) {
    const texto = error.message.toLowerCase();
    if (texto.includes("same") || texto.includes("different")) {
      return { erros: { senha: "A senha nova precisa ser diferente da anterior." } };
    }
    if (texto.includes("session") || error.status === 401) {
      return {
        mensagem: "O link de recuperação expirou. Peça um novo em \"Esqueci a senha\".",
      };
    }
    return { mensagem: "Não foi possível alterar a senha agora. Tente de novo em alguns minutos." };
  }

  // Encerra a sessão temporária e pede login com a senha nova.
  await supabase.auth.signOut();
  redirect("/entrar?senha=alterada");
}
