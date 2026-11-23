import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Caminhos que exigem login. Sem sessão válida, o visitante vai para /entrar.
const AREA_LOGADA = ["/painel"];

function exigeLogin(caminho: string) {
  return AREA_LOGADA.some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

// Roda a cada acesso (via src/proxy.ts): renova a sessão de login quando ela
// está para expirar e protege a área logada.
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Respostas que gravam cookies de sessão não podem ficar em cache.
          Object.entries(headers ?? {}).forEach(([nome, valor]) =>
            response.headers.set(nome, valor),
          );
        },
      },
    },
  );

  // Importante: nada entre createServerClient e getClaims. getClaims valida o
  // token de verdade (não confia só no cookie) e renova a sessão se preciso.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);

  if (!logado && exigeLogin(request.nextUrl.pathname)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.search = "";
    destino.searchParams.set("proxima", request.nextUrl.pathname);
    const redirecionamento = NextResponse.redirect(destino);
    // Leva junto qualquer cookie que a renovação tenha gravado.
    response.cookies.getAll().forEach((c) => redirecionamento.cookies.set(c));
    return redirecionamento;
  }

  return response;
}
