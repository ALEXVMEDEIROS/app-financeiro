// Tradução dos erros do banco para mensagens em português, dizendo o que fazer.
// O usuário nunca vê a mensagem técnica.

type ErroBanco = { code?: string; message?: string } | null | undefined;

const PADRAO: Record<string, string> = {
  "23505": "Já existe um cadastro com esse nome. Use outro nome.",
  "23503": "Este item está sendo usado por outros registros e não pode ser removido. Você pode desativá-lo.",
  "23514": "Algum dado não segue as regras do Sobra Vida. Confira os campos e tente de novo.",
  "22003": "Valor grande demais. O valor máximo é R$ 999.999.999,99.",
  "42501": "Você não tem permissão para fazer isso. Entre de novo e tente outra vez.",
  "PGRST116": "Não encontramos esse registro. Ele pode ter sido removido.",
};

/**
 * Mensagem amigável para um erro do Supabase. `especificas` permite trocar
 * a mensagem de um código para o contexto da tela.
 */
export function mensagemDeErro(erro: ErroBanco, especificas: Record<string, string> = {}): string {
  const codigo = erro?.code ?? "";
  return (
    especificas[codigo] ??
    PADRAO[codigo] ??
    "Não foi possível salvar agora. Verifique sua conexão e tente de novo em alguns instantes."
  );
}
