# Supabase — guia do projeto AwgFinanceiro

Este arquivo explica como o projeto se conecta ao Supabase e como usar o **Supabase MCP** (para que
um agente de IA, como o do Antigravity, consulte e altere o banco com segurança).

## Projeto Supabase

| Item | Valor |
|---|---|
| Project ref | `mdcymhgqzvdrojasuxhb` |
| Região | sa-east-1 (São Paulo) |
| URL da API | `https://mdcymhgqzvdrojasuxhb.supabase.co` |
| Variáveis do app | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (em `.env.local`; modelo em `.env.example`) |

> ⚠️ Este projeto Supabase é **compartilhado com outros sistemas** (propostas, empréstimos, tradeflow...).
> As tabelas do AwgFinanceiro devem usar o prefixo **`awg_`** para não colidir.
> Já existem tabelas como `fin_settings`, `settings`, `transaction` que **não são deste sistema** — não altere.

## Estado atual (07/10/2026)

- O AwgFinanceiro **ainda não usa o Supabase**: os dados ficam no navegador. Nenhuma tabela `awg_` foi criada.
- **Alerta de segurança:** 16 tabelas de outros sistemas estão sem RLS e o usuário anônimo pode ler, inserir e
  apagar dados nelas (ver relatório do Security Advisor no painel do Supabase). Precisa ser resolvido antes
  de usar o projeto em produção.
- Proteção contra senhas vazadas (Auth → Password security) está desligada.

## Como ligar o Supabase MCP no Antigravity

O Antigravity lê os servidores MCP do arquivo **`~/.gemini/config/mcp_config.json`** (na sua pasta de usuário,
não dentro do projeto). Há dois modelos prontos nesta pasta:

### Opção A — servidor hospedado (recomendado, sem token)
Arquivo: `supabase/mcp_config.antigravity.json`

1. Copie o conteúdo para `~/.gemini/config/mcp_config.json` (se já existir, junte dentro de `"mcpServers"`).
2. Reinicie o Antigravity (ou recarregue os servidores MCP).
3. Na primeira vez, abrirá uma janela para entrar na sua conta Supabase e autorizar.

### Opção B — servidor local com token pessoal (se a opção A não autenticar)
Arquivo: `supabase/mcp_config.antigravity.token.json`

1. Crie um token em supabase.com → Account → Access Tokens.
2. Copie o modelo para `~/.gemini/config/mcp_config.json` e troque `COLE_AQUI_O_SEU_TOKEN_PESSOAL` pelo token.
3. **Nunca** coloque o token em arquivos desta pasta (ela é sincronizada no Google Drive).

### Configuração de segurança usada nos modelos
- `project_ref=mdcymhgqzvdrojasuxhb` → o agente só enxerga **este** projeto, não os outros da sua conta.
- `read_only=true` → o agente **só consulta**; não consegue alterar nem apagar nada.
- `features=database,docs,debugging,development` → só as ferramentas necessárias (sem gerenciar conta, cobrança etc.).

Quando for preciso **alterar** o banco (criar tabelas do login, por exemplo), troque temporariamente
`read_only=true` por `read_only=false`, faça a alteração revisando cada comando, e volte para `true`.

## Regras para o agente (ao usar o MCP neste projeto)

1. Antes de qualquer alteração, listar as tabelas e conferir o que já existe.
2. Toda alteração de estrutura via `apply_migration`, e uma cópia do SQL salva em `supabase/migrations/`.
3. Toda tabela nova: prefixo `awg_`, RLS ligado e políticas restritas a usuários autenticados autorizados.
4. Nunca desligar RLS, nunca dar permissão ao papel `anon` em tabelas com dados.
5. Nunca mexer em tabelas de outros sistemas sem pedir confirmação.
6. Rodar o Security Advisor (`get_advisors`) depois de cada alteração.
7. Nunca expor a chave `service_role` no frontend nem em arquivos do projeto.
