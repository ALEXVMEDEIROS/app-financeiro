// Cópia de segurança dos dados do Sobra Vida (só leitura no banco).
//
// Uso:  npm run copia-banco            → salva em Documentos\Sobra Vida - copias
//       npm run copia-banco -- "D:\X"  → salva na pasta indicada
//
// A estrutura do banco já está guardada no Git (supabase/migrations); aqui ficam os DADOS,
// um arquivo JSON por tabela, mais um resumo com a contagem de linhas e a versão do código.
// A cópia contém dados pessoais: fica FORA do projeto e nunca vai para o GitHub.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, relative, isAbsolute } from "node:path";

const PROJETO = resolve(import.meta.dirname, "..");

// Tabelas do esquema public, na ordem em que teriam de ser restauradas (pais antes dos filhos).
const ORDEM = [
  "perfis",
  "grupos",
  "categorias",
  "centros_custo",
  "formas_pagamento",
  "contas_financeiras",
  "pessoas",
  "bens",
  "lancamentos",
];

function consultar(sql) {
  // Uma linha de comando só: o SQL vem deste script, nunca de fora.
  const r = spawnSync(`npx.cmd supabase db query --remote --read-only --output-format json ${sql}`, {
    cwd: PROJETO,
    encoding: "utf8",
    shell: true,
    maxBuffer: 512 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`Consulta falhou:\n${r.stderr || r.stdout}`);
  const inicio = r.stdout.indexOf("{");
  return JSON.parse(r.stdout.slice(inicio)).rows;
}

const aspas = (sql) => `"${sql.replace(/"/g, '\\"')}"`;
const q = (sql) => consultar(aspas(sql));

// Confere se apareceu tabela nova que ainda não está na lista: melhor falhar do que copiar pela metade.
const existentes = q(
  "select table_name as t from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1",
).map((l) => l.t);
const faltando = existentes.filter((t) => !ORDEM.includes(t));
if (faltando.length > 0) {
  console.error(`Tabelas novas fora da cópia: ${faltando.join(", ")}. Inclua-as em ORDEM no script.`);
  process.exit(1);
}

const carimbo = new Date()
  .toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" })
  .replace(" ", "_")
  .replace(/:/g, "")
  .slice(0, 15);
const base = process.argv[2] ? resolve(process.argv[2]) : join(homedir(), "Documents", "Sobra Vida - copias");
const pasta = join(base, carimbo);
const dentro = relative(PROJETO, pasta);
if (!dentro.startsWith("..") && !isAbsolute(dentro)) {
  console.error("A cópia tem dados pessoais e não pode ficar dentro da pasta do projeto.");
  process.exit(1);
}
mkdirSync(pasta, { recursive: true });

const resumo = { criada_em: new Date().toISOString(), commit: "", tabelas: {} };
try {
  resumo.commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: PROJETO, encoding: "utf8" }).trim();
} catch {}

for (const tabela of [...ORDEM.filter((t) => existentes.includes(t)), "auth.users"]) {
  // Dos usuários, só o necessário para religar os dados a cada login (sem senhas).
  const origem = tabela === "auth.users" ? "(select id, email, created_at from auth.users) t" : `public.${tabela} t`;
  const [{ dados }] = q(`select coalesce(json_agg(t), '[]'::json) as dados from ${origem}`);
  const [{ n }] = q(`select count(*)::int as n from ${origem}`);
  if (dados.length !== n) throw new Error(`${tabela}: copiadas ${dados.length} de ${n} linhas.`);
  const arquivo = `${tabela.replace(".", "_")}.json`;
  writeFileSync(join(pasta, arquivo), JSON.stringify(dados, null, 1), "utf8");
  // Relê o arquivo gravado para ter certeza de que está íntegro.
  const relido = JSON.parse(readFileSync(join(pasta, arquivo), "utf8"));
  if (relido.length !== n) throw new Error(`${tabela}: arquivo gravado não confere.`);
  resumo.tabelas[tabela] = n;
  console.log(`${tabela.padEnd(20)} ${String(n).padStart(6)} linhas`);
}

writeFileSync(join(pasta, "_resumo.json"), JSON.stringify(resumo, null, 2), "utf8");
console.log(`\nCópia conferida e salva em:\n${pasta}`);
