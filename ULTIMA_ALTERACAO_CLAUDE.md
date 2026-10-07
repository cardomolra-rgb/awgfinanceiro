# Última alteração feita pelo Claude

**Data:** 07/10/2026 (11:58)

## O que foi feito
Corrigida a importação de extrato que "não importava" depois que o login passou a funcionar.

- **Arquivos alterados:** `App.tsx` e `store/useFinanceStore.ts` (poucas linhas).
- **Causa:** a cada mudança nos dados, o sistema reiniciava a escuta do login e, com isso, recarregava
  tudo do Supabase por cima da tela. O extrato era lido corretamente, mas em menos de 1 segundo os
  lançamentos importados eram substituídos pelos dados do banco (que ainda não os tinha), antes de
  serem salvos. Nos registros do Supabase aparecia o sistema relendo o banco dezenas de vezes por segundo.
- **Correção:** os dados só são recarregados do banco quando alguém entra no sistema (login), e não a
  cada alteração. Assim, o que é importado fica na tela e é salvo no Supabase normalmente.
- Verificado: o projeto compila e os testes passam.

## Para entrar no ar
Enviar para o GitHub (no Antigravity: Sync/Push; ou `git push origin main`). A Vercel publica sozinha.

## Pendente (aguardando sua decisão)
- As tabelas `awg_*` continuam abertas para qualquer pessoa (política "Permitir acesso total").
  A correção já está preparada; falta você aprovar.
