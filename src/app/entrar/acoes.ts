"use server";

import { redirect } from "next/navigation";
import { destinoSeguro } from "@/components/campo";
import { createClient } from "@/lib/supabase/server";

export type EstadoEntrar = {
  mensagem?: string;
  email?: string;
};

export async function entrar(_anterior: EstadoEntrar, formData: FormData): Promise<EstadoEntrar> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const proxima = destinoSeguro(String(formData.get("proxima") ?? ""));

  if (!email || !senha) {
    return { mensagem: "Informe o e-mail e a senha.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    const texto = error.message.toLowerCase();
    let mensagem = "Não foi possível entrar agora. Tente de novo em alguns minutos.";
    if (texto.includes("invalid login credentials")) {
      mensagem = "E-mail ou senha incorretos.";
    } else if (texto.includes("email not confirmed")) {
      mensagem =
        "Seu e-mail ainda não foi confirmado. Abra o link que enviamos no cadastro (veja também o spam).";
    } else if (texto.includes("rate limit") || error.status === 429) {
      mensagem = "Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.";
    }
    return { mensagem, email };
  }

  redirect(proxima);
}
