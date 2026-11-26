export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bens: {
        Row: {
          ativo: boolean
          criado_em: string
          data_avaliacao: string
          id: string
          nome: string
          tipo: string
          usuario_id: string
          valor_avaliacao: number
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          data_avaliacao?: string
          id?: string
          nome: string
          tipo: string
          usuario_id?: string
          valor_avaliacao: number
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          data_avaliacao?: string
          id?: string
          nome?: string
          tipo?: string
          usuario_id?: string
          valor_avaliacao?: number
        }
        Relationships: []
      }
      categorias: {
        Row: {
          ativa: boolean
          criado_em: string
          grupo_id: string
          id: string
          nome: string
          usuario_id: string
        }
        Insert: {
          ativa?: boolean
          criado_em?: string
          grupo_id: string
          id?: string
          nome: string
          usuario_id?: string
        }
        Update: {
          ativa?: boolean
          criado_em?: string
          grupo_id?: string
          id?: string
          nome?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_usuario_id_grupo_id_fkey"
            columns: ["usuario_id", "grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["usuario_id", "id"]
          },
        ]
      }
      centros_custo: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
          usuario_id?: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          usuario_id?: string
        }
        Relationships: []
      }
      contas_financeiras: {
        Row: {
          agencia: string | null
          ativa: boolean
          codigo_banco: string | null
          criado_em: string
          data_saldo_inicial: string
          id: string
          instituicao: string | null
          nome: string
          numero_conta: string | null
          saldo_inicial: number
          tipo: string
          usuario_id: string
        }
        Insert: {
          agencia?: string | null
          ativa?: boolean
          codigo_banco?: string | null
          criado_em?: string
          data_saldo_inicial?: string
          id?: string
          instituicao?: string | null
          nome: string
          numero_conta?: string | null
          saldo_inicial?: number
          tipo: string
          usuario_id?: string
        }
        Update: {
          agencia?: string | null
          ativa?: boolean
          codigo_banco?: string | null
          criado_em?: string
          data_saldo_inicial?: string
          id?: string
          instituicao?: string | null
          nome?: string
          numero_conta?: string | null
          saldo_inicial?: number
          tipo?: string
          usuario_id?: string
        }
        Relationships: []
      }
      formas_pagamento: {
        Row: {
          ativa: boolean
          criado_em: string
          dias_recebimento: number
          id: string
          nome: string
          parcelas_max: number
          usuario_id: string
        }
        Insert: {
          ativa?: boolean
          criado_em?: string
          dias_recebimento?: number
          id?: string
          nome: string
          parcelas_max?: number
          usuario_id?: string
        }
        Update: {
          ativa?: boolean
          criado_em?: string
          dias_recebimento?: number
          id?: string
          nome?: string
          parcelas_max?: number
          usuario_id?: string
        }
        Relationships: []
      }
      grupos: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          natureza: string
          nome: string
          ordem: number
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          natureza: string
          nome: string
          ordem?: number
          usuario_id?: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          natureza?: string
          nome?: string
          ordem?: number
          usuario_id?: string
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          atualizado_em: string
          categoria_id: string | null
          centro_custo_id: string | null
          conta_destino_id: string | null
          conta_id: string
          criado_em: string
          data_lancamento: string
          data_pagamento: string | null
          data_vencimento: string
          desconto: number
          forma_pagamento_id: string | null
          grupo_parcelas_id: string | null
          id: string
          juros: number
          multa: number
          observacao: string | null
          parcela_num: number | null
          parcela_total: number | null
          pessoa_id: string | null
          tipo: string
          usuario_id: string
          valor: number
        }
        Insert: {
          atualizado_em?: string
          categoria_id?: string | null
          centro_custo_id?: string | null
          conta_destino_id?: string | null
          conta_id: string
          criado_em?: string
          data_lancamento?: string
          data_pagamento?: string | null
          data_vencimento: string
          desconto?: number
          forma_pagamento_id?: string | null
          grupo_parcelas_id?: string | null
          id?: string
          juros?: number
          multa?: number
          observacao?: string | null
          parcela_num?: number | null
          parcela_total?: number | null
          pessoa_id?: string | null
          tipo: string
          usuario_id?: string
          valor: number
        }
        Update: {
          atualizado_em?: string
          categoria_id?: string | null
          centro_custo_id?: string | null
          conta_destino_id?: string | null
          conta_id?: string
          criado_em?: string
          data_lancamento?: string
          data_pagamento?: string | null
          data_vencimento?: string
          desconto?: number
          forma_pagamento_id?: string | null
          grupo_parcelas_id?: string | null
          id?: string
          juros?: number
          multa?: number
          observacao?: string | null
          parcela_num?: number | null
          parcela_total?: number | null
          pessoa_id?: string | null
          tipo?: string
          usuario_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_usuario_id_categoria_id_fkey"
            columns: ["usuario_id", "categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["usuario_id", "id"]
          },
          {
            foreignKeyName: "lancamentos_usuario_id_centro_custo_id_fkey"
            columns: ["usuario_id", "centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["usuario_id", "id"]
          },
          {
            foreignKeyName: "lancamentos_usuario_id_conta_destino_id_fkey"
            columns: ["usuario_id", "conta_destino_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["usuario_id", "id"]
          },
          {
            foreignKeyName: "lancamentos_usuario_id_conta_id_fkey"
            columns: ["usuario_id", "conta_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["usuario_id", "id"]
          },
          {
            foreignKeyName: "lancamentos_usuario_id_forma_pagamento_id_fkey"
            columns: ["usuario_id", "forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["usuario_id", "id"]
          },
          {
            foreignKeyName: "lancamentos_usuario_id_pessoa_id_fkey"
            columns: ["usuario_id", "pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["usuario_id", "id"]
          },
        ]
      }
      perfis: {
        Row: {
          criado_em: string
          id: string
          nome: string
          plano: string
        }
        Insert: {
          criado_em?: string
          id: string
          nome?: string
          plano?: string
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
          plano?: string
        }
        Relationships: []
      }
      pessoas: {
        Row: {
          ativa: boolean
          contato: string | null
          criado_em: string
          documento: string | null
          id: string
          nome: string
          tipo: string
          usuario_id: string
        }
        Insert: {
          ativa?: boolean
          contato?: string | null
          criado_em?: string
          documento?: string | null
          id?: string
          nome: string
          tipo?: string
          usuario_id?: string
        }
        Update: {
          ativa?: boolean
          contato?: string | null
          criado_em?: string
          documento?: string | null
          id?: string
          nome?: string
          tipo?: string
          usuario_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      resultado_mensal: {
        Args: { p_ano: number; p_visao?: string }
        Returns: {
          categoria: string
          categoria_ativa: boolean
          categoria_id: string
          grupo: string
          grupo_ativo: boolean
          grupo_id: string
          grupo_ordem: number
          mes: number
          natureza: string
          valor: number
        }[]
      }
      saldos_contas: {
        Args: { p_data_atual: string; p_data_prevista: string }
        Returns: {
          ativa: boolean
          conta_id: string
          instituicao: string
          nome: string
          saldo_atual: number
          saldo_inicial: number
          saldo_previsto: number
          tipo: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
