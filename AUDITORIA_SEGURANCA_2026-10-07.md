# Auditoria de Segurança — AwgFinanceiro (07/10/2026)

## Como o sistema funciona hoje (base da auditoria)
- Aplicação **somente frontend** (React + Vite). **Não há servidor, API, banco de dados, login nem perfis de usuário em uso.**
- Todos os dados ficam no **navegador** (localStorage, chave `finance_pro_data_v4`). Backups são arquivos `.json` baixados.
- Entradas de dados externos: formulários, importação de extrato (OFX/CSV), restauração de backup (JSON) e upload de logo.
- Saídas: tela, CSV (Excel), backup JSON.
- `backend/server.ts` (Express + Prisma) existe na pasta, mas não é usado, não tem `package.json` e não é publicado.
- Supabase: há chaves em `.env.local`, mas o código não usa o Supabase (`lib/supabase.ts` não é importado). O projeto Supabase correspondente está **pausado**.

## Resumo
- Vulnerabilidades encontradas: **12** (+5 observações)
- Corrigidas: **10**
- Mitigada (bloqueada, precisa de decisão): **1**
- Precisam de intervenção manual: **1** vulnerabilidade + observações

## Vulnerabilidades
| # | Gravidade | Problema | Arquivo | Impacto | Status |
|---|---|---|---|---|---|
| 1 | ALTA | Duas abas abertas: a aba desatualizada sobrescrevia os dados da outra | `store/useFinanceStore.ts` | Perda silenciosa de lançamentos (reproduzido: lançamento da aba A sumiu) | Corrigida |
| 2 | ALTA | Backup/dados salvos sem validação: um campo com tipo errado deixava telas em branco | `lib/finance.ts` (normalizeState) | Sistema inutilizável; dado salvo continuava quebrando (reproduzido) | Corrigida (`lib/sanitize.ts`) |
| 3 | MÉDIA | Injeção de fórmula no CSV (ex.: descrição de PIX `=HYPERLINK(...)`) | `lib/utils.ts` (downloadCSV) | Fórmula executada ao abrir no Excel (reproduzido) | Corrigida |
| 4 | MÉDIA | Sem tela de erro: qualquer falha derrubava a página inteira | `index.tsx` | Tela branca sem saída | Corrigida (`components/ErrorBoundary.tsx`) |
| 5 | MÉDIA | Restaurar backup substituía tudo sem guardar cópia dos dados atuais | `App.tsx`, `components/ImportModal.tsx` | Perda total ao restaurar arquivo errado | Corrigida |
| 6 | MÉDIA | Sem cabeçalhos de segurança/CSP para quando for publicado | (novo) `vercel.json`, `vite.config.ts` | Clickjacking, injeção de scripts de terceiros | Corrigida (validar após publicar) |
| 7 | MÉDIA* | `backend/server.ts`: sem autenticação, CORS aberto, grava corpo da requisição direto no banco, sem validação/tratamento de erros | `backend/server.ts` | *Se publicado*, qualquer pessoa leria/alteraria dados | Mitigada: servidor bloqueado; recomenda-se excluir |
| 8 | BAIXA | Logo aceitava endereço externo vindo de backup | `lib/sanitize.ts` | Rastreamento (IP) ao abrir o sistema | Corrigida |
| 9 | BAIXA | Sem limite de tamanho em importação e logo | `ImportModal.tsx`, `Settings.tsx` | Travamento do navegador | Corrigida (10 MB / 5 MB) |
| 10 | BAIXA | `vite.config.ts` injetava `GEMINI_API_KEY` no código público (hoje valor é placeholder) | `vite.config.ts` | Vazamento futuro de chave real | Corrigida |
| 11 | BAIXA | Servidor de desenvolvimento aberto para toda a rede (`0.0.0.0`) | `vite.config.ts` | Acesso por outros aparelhos da rede local | Corrigida (`localhost`) |
| 12 | BAIXA | Dependências de build com falhas conhecidas (braces, postcss-selector-parser via Tailwind 3) | `package.json` | Só afeta a máquina de build; dependências de produção: 0 falhas | Manual (exige Tailwind 4) |

### Observações (não exploráveis hoje, mas importantes)
- **O1 – Sem login/perfis.** Quem tiver acesso ao computador/navegador tem acesso total. Publicado online, cada visitante vê apenas os dados do próprio navegador (não há vazamento entre usuários), mas **qualquer pessoa pode usar o app**.
- **O2 – Dados financeiros sem criptografia** no navegador e nos backups `.json`.
- **O3 – `.env.local`** contém a chave `anon` real do Supabase (pública por natureza; não vai para o código publicado). A pasta está no Google Drive: não compartilhe a pasta. RLS do Supabase **não pôde ser verificado** (projeto pausado).
- **O4 – Google Fonts** carregado de terceiro (privacidade/disponibilidade).
- **O5 – Arquivos sem uso:** `components/BankReconciliationModal.tsx`, `fix.cjs`, `replace_colors.cjs`, `check_supabase.js`, `lib/.pdfReport.ts.swp` (arquivo temporário de editor), pasta `backend/`.

## Endpoints (API)
O sistema publicado **não tem API**. Os únicos endpoints estão no `backend/server.ts` (não usado, agora bloqueado):

| Endpoint | Método | Autenticação | Autorização | Risco | Correção |
|---|---|---|---|---|---|
| /api/transactions | GET | Nenhuma | Nenhuma | Expõe todos os lançamentos | Bloqueado; excluir ou reescrever com auth |
| /api/transactions | POST | Nenhuma | Nenhuma | Mass assignment (`req.body` direto no Prisma) | Bloqueado |
| /api/categories | GET | Nenhuma | Nenhuma | Exposição de dados | Bloqueado |
| /api/settings | GET | Nenhuma | Nenhuma | Exposição de dados | Bloqueado |
| /api/settings | PUT | Nenhuma | Nenhuma | Alteração por qualquer pessoa | Bloqueado |
| /uploads/* | GET | Nenhuma | Nenhuma | Arquivos públicos | Bloqueado |

## Matriz de permissões
| Permissão | Admin | Gestor | Vendedor | Usuário |
|---|---|---|---|---|
| (todas) | — | — | — | — |

**Não existem perfis no código.** Não há o que comparar: toda pessoa com acesso ao navegador tem acesso total. Perfis só fazem sentido com servidor + login (ex.: Supabase Auth + RLS).

## Alterações realizadas
- `lib/sanitize.ts` (novo): validação campo a campo de tudo que é carregado/restaurado (tipos, tamanhos, cores, datas, IDs, logo apenas `data:image`, moeda, campos desconhecidos descartados, IDs duplicados ignorados).
- `lib/finance.ts`: `normalizeState` passa a usar a validação.
- `store/useFinanceStore.ts`: sincronização entre abas (evento `storage`) e gravação só quando há mudança.
- `lib/utils.ts`: neutralização de fórmulas no CSV; `formatCurrency` não quebra com moeda malformada.
- `components/ErrorBoundary.tsx` (novo) + `index.tsx`: tela de recuperação com "Baixar meus dados".
- `App.tsx` / `components/ImportModal.tsx`: cópia automática dos dados atuais antes de restaurar backup; limite de 10 MB.
- `components/Settings.tsx`: limite de 5 MB no logo.
- `vercel.json` (novo): CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP.
- `vite.config.ts`: remove injeção de chave, dev só em `localhost`, mesmos cabeçalhos no `npm run preview`, sem source maps.
- `backend/server.ts`: recusa iniciar (aviso no topo).
- `tests/logic.test.ts`: 18 testes de segurança novos.

## Evidências
- 3 ataques reproduzidos **antes** (perda multi-aba, tela branca por backup malformado, fórmula no CSV) e **bloqueados depois**, no navegador.
- Cabeçalhos conferidos na resposta HTTP do `npm run preview`; **0 violações de CSP** navegando por todas as telas.
- `tsc` sem erros (no seu computador), 74 testes automáticos passando, build OK, sem source maps.
- `npm audit --omit=dev`: 0 vulnerabilidades em produção.
- Varredura de segredos: nenhuma chave no código publicado; `GEMINI_API_KEY` é placeholder; chave `anon` só em `.env.local` (ignorado pelo `.gitignore`). Pasta sem Git (nada exposto em histórico).

## Riscos restantes
1. Excluir (ou reescrever com autenticação) a pasta `backend/`.
2. Atualizar para Tailwind 4 em momento oportuno (resolve #12; mudança grande).
3. Antes de publicar online: decidir se o acesso será aberto (proteção por senha da Vercel é o mínimo recomendado).
4. Ao ativar o Supabase: login obrigatório + RLS em todas as tabelas + nunca usar a chave `service_role` no frontend.
5. Proteger o computador (senha/bloqueio) e os backups (pasta privada no Drive).

## Checklist final
- [ ] Autenticação segura — **não existe autenticação** (não aplicável hoje; necessário antes de dados no servidor)
- [ ] Autorização segura — **não existem perfis**
- [x] APIs protegidas — não há API em uso; backend antigo bloqueado
- [ ] Banco protegido — não há banco em uso; Supabase pausado, RLS não verificável
- [x] Secrets protegidos — nenhum segredo no código publicado
- [x] Uploads protegidos — logo validado/limitado/convertido; importações limitadas e validadas
- [ ] Rate limiting — não aplicável sem servidor
- [x] CORS configurado — sem API; backend com CORS aberto bloqueado
- [x] Headers de segurança — `vercel.json` (validar após publicar)
- [x] Dependências verificadas — produção 0; build: 2 pacotes com falha conhecida (manual)
- [x] Logs seguros — só `console.error` local, sem dados sensíveis
- [x] Erros seguros — tela de recuperação; nada interno exibido
- [ ] Controle de acesso validado no backend — não há backend
- [x] Build funcionando
- [x] Testes funcionando
- [x] Nenhuma credencial exposta no código publicado
