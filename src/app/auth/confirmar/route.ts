import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Recebe o clique no link do e-mail (confirmação de cadastro e, depois,
// recuperação de senha). Valida o link, cria a sessão de login e leva o
// usuário para dentro do app.
//
// Aceita os dois formatos do Supabase:
//   ?token_hash=...&type=email  (modelo de e-mail do Sobra Vida; funciona em
//                                qualquer navegador ou aparelho)
//   ?code=...                   (formato padrão; só funciona no mesmo navegador
//                                em que a pessoa se cadastrou)

// Só aceita destinos dentro do próprio site, para ninguém usar o link
// para mandar o usuário a um endereço externo.
function destinoSeguro(valor: string | null) {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) {
    return "/painel";
  }
  return valor;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const codigo = searchParams.get("code");
  const proxima = destinoSeguro(searchParams.get("proxima"));

  const supabase = await createClient();
  let deuCerto = false;

  if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    deuCerto = !error;
  } else if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    deuCerto = !error;
  }

  if (deuCerto) {
    const destino = tipo === "recovery" ? "/nova-senha" : proxima;
    return NextResponse.redirect(new URL(destino, origin));
  }

  return NextResponse.redirect(new URL("/auth/erro", origin));
}
