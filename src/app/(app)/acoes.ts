"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Encerra a sessão neste navegador e volta para a tela de entrar.
export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
