import { createClient } from "@/lib/supabase/server";

/** Instituições já usadas nas contas do usuário, para sugerir no formulário. */
export async function instituicoesDoUsuario(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("contas_financeiras").select("instituicao").not("instituicao", "is", null);
  const nomes = new Map<string, string>();
  for (const linha of data ?? []) {
    const nome = linha.instituicao?.trim();
    if (nome && !nomes.has(nome.toLowerCase())) nomes.set(nome.toLowerCase(), nome);
  }
  return [...nomes.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
