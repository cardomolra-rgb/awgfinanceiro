# Última alteração feita pelo Claude

**Data:** 07/10/2026

## O que foi feito
Corrigido o motivo do login não funcionar na Vercel ("a Vercel não conversa com o Supabase").

- **Arquivo alterado:** `vercel.json` (só 1 linha).
- **Causa:** a regra de segurança do navegador (Content-Security-Policy, `connect-src 'self'`) só deixava
  o site falar com o próprio domínio. Toda chamada ao Supabase (login, cadastro, dados) era bloqueada
  pelo navegador antes de sair. Por isso o Supabase não registrava nenhuma tentativa de login vinda do site.
- **Correção:** `connect-src` agora permite também o seu projeto Supabase:
  `https://mdcymhgqzvdrojasuxhb.supabase.co` e `wss://mdcymhgqzvdrojasuxhb.supabase.co` (tempo real).
  O resto das proteções continua igual.
- Testado em navegador: com a regra antiga a chamada é bloqueada; com a nova, é liberada.

## Para entrar no ar
1. Fazer commit e push para o GitHub (branch `main`). A Vercel publica sozinha.
2. No painel do Supabase → Authentication → URL Configuration:
   - **Site URL:** o endereço do site na Vercel (ex.: `https://SEU-SITE.vercel.app`)
   - **Redirect URLs:** `https://SEU-SITE.vercel.app/**`
   Sem isso, os links de confirmação de e-mail e de "esqueci a senha" apontam para o endereço errado.

## Atenção (não alterado, aguardando sua decisão)
- As tabelas `awg_*` estão com a política "Permitir acesso total" para qualquer pessoa: quem tiver a
  chave pública do site consegue ler e apagar os dados financeiros sem fazer login.
