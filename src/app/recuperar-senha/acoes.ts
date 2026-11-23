"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type EstadoRecuperar = {
  status: "inicial" | "erro" | "enviado";
  mensagem?: string;
  email?: string;
};

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function recuperarSenha(
  _anterior: EstadoRecuperar,
  formData: FormData,
): Promise<EstadoRecuperar> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_VALIDO.test(email)) {
    return { status: "erro", mensagem: "Informe um e-mail válido, como nome@exemplo.com.", email };
  }

  const cabecalhos = await headers();
  const origem =
    cabecalhos.get("origin") ??
    `https://${cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origem}/auth/confirmar?proxima=/nova-senha`,
  });

  if (error && (error.status === 429 || error.message.toLowerCase().includes("rate limit"))) {
    return {
      status: "erro",
      mensagem: "Muitos pedidos em pouco tempo. Espere alguns minutos e tente de novo.",
      email,
    };
  }

  // Mesma resposta exista ou não uma conta com esse e-mail.
  return { status: "enviado", email };
}
