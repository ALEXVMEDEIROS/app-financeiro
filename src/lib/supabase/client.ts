import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./tipos";

// Cliente do Supabase para uso no navegador. As regras de isolamento por usuário
// ficam no banco (Row Level Security), não aqui.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
