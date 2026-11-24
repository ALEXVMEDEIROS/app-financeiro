// Datas do Sobra Vida. Trabalhamos com datas sem hora, no formato ISO
// "AAAA-MM-DD", que é o que o banco guarda (colunas do tipo date).

const FUSO = "America/Sao_Paulo";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Data de hoje no horário de São Paulo. O banco usa o horário UTC, que já está
 * no dia seguinte a partir das 21h; por isso o app sempre envia a data.
 */
export function hojeEmSaoPaulo(agora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const pega = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${pega("year")}-${pega("month")}-${pega("day")}`;
}

function partes(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return { a, m, d };
}

/** Último dia do mês (1 a 12). */
export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/**
 * Soma meses mantendo o dia original; em meses mais curtos usa o último dia.
 * Ex.: 2027-01-31 + 1 = 2027-02-28; + 2 = 2027-03-31.
 */
export function somarMeses(iso: string, meses: number): string {
  const { a, m, d } = partes(iso);
  const total = a * 12 + (m - 1) + meses;
  const ano = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  const dia = Math.min(d, diasNoMes(ano, mes));
  return `${ano}-${pad(mes)}-${pad(dia)}`;
}

/** Primeiro e último dia do mês de uma data. */
export function intervaloDoMes(iso: string): { inicio: string; fim: string } {
  const { a, m } = partes(iso);
  return { inicio: `${a}-${pad(m)}-01`, fim: `${a}-${pad(m)}-${pad(diasNoMes(a, m))}` };
}

/** "novembro de 2026" */
export function nomeDoMes(iso: string): string {
  const { a, m } = partes(iso);
  return `${MESES[m - 1]} de ${a}`;
}

/** "24/11/2026" */
export function formatarData(iso: string): string {
  const { a, m, d } = partes(iso);
  return `${pad(d)}/${pad(m)}/${a}`;
}

/** Confere se o texto é uma data real no formato AAAA-MM-DD. */
export function dataValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const { a, m, d } = partes(iso);
  return m >= 1 && m <= 12 && d >= 1 && d <= diasNoMes(a, m) && a >= 2000 && a <= 2100;
}

export type Situacao = "pago" | "atrasado" | "em_aberto";

/** Situação de um lançamento (R2): pago, atrasado ou em aberto. */
export function situacao(vencimento: string, pagamento: string | null, hoje: string): Situacao {
  if (pagamento) return "pago";
  return vencimento < hoje ? "atrasado" : "em_aberto";
}
