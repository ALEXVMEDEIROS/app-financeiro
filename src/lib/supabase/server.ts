import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente do Supabase para o servidor (Server Components, Server Actions e
// Route Handlers). Lê e grava os cookies da sessão de login.
// Crie um cliente novo a cada uso; não guarde em variável global.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component, que não pode gravar cookies.
            // Sem problema: o proxy (src/proxy.ts) renova a sessão a cada acesso.
          }
        },
      },
    },
  );
}
