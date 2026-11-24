import type { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "perigo" | "discreto";

const estilos: Record<Variante, string> = {
  primario: "bg-accent text-bg hover:opacity-90",
  secundario: "border border-line bg-surface text-fg hover:border-muted",
  perigo: "bg-neg text-bg hover:opacity-90",
  discreto: "text-accent hover:underline underline-offset-4",
};

// Botão padrão do app. Altura mínima de 44 px, para tocar com o dedo.
export function Botao({
  variante = "primario",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 font-semibold transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${estilos[variante]} ${className}`}
      {...props}
    />
  );
}
