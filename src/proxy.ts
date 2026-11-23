import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

// No Next.js 16, o antigo "middleware" se chama "proxy".
export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  // Roda em todas as páginas, menos arquivos estáticos e imagens.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
