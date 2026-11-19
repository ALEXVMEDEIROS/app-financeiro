import { createBrowserClient } from "@supabase/ssr";

// Cliente do Supabase para uso no navegador. As regras de isolamento por usuário
// ficam no banco (Row Level Security), não aqui.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
