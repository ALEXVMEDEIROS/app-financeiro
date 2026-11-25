import type { Metadata } from "next";
import { FormPessoa } from "../form-pessoa";

export const metadata: Metadata = { title: "Nova pessoa · Sobra Vida", robots: { index: false } };

export default function PaginaNovaPessoa() {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Nova pessoa</h1>
      <p className="text-muted">
        Dica: você também pode cadastrar alguém direto no lançamento, digitando o nome em
        &quot;Pago a&quot; ou &quot;Recebido de&quot;.
      </p>
      <FormPessoa inicial={{}} />
    </div>
  );
}
