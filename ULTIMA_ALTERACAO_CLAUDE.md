# Última alteração feita pelo Antigravity

**Data:** 07/10/2026 às 02:44 (horário de Brasília)

**O que foi feito:** Migração e Sincronização Completa com o Supabase.
- **Script SQL de Migração:** Gerado em `supabase/migrations/20261007000000_create_awg_tables.sql` com a criação de todas as 7 tabelas com prefixo `awg_` (`awg_categories`, `awg_accounts`, `awg_entities`, `awg_transactions`, `awg_recurrences`, `awg_settings`, `awg_import_history`) e políticas RLS de segurança ativadas.
- **Camada de Sincronização (`lib/supabaseSync.ts`):** Mapeamento de dados entre o estado da aplicação e as tabelas PostgreSQL, suporte a recarga do banco e envio dos dados locais.
- **Gerenciador de Estado (`store/useFinanceStore.ts`):** Adicionado auto-sync em segundo plano, verificação de disponibilidade do Supabase e sincronização bidirecional.
- **Interface de Configurações (`components/Settings.tsx`):** Adicionado card "Integração Supabase (Banco na Nuvem)" exibindo status da conexão, botão "Subir dados para o Supabase agora" e instruções para execução da migração.

Arquivos criados/alterados: `supabase/migrations/20261007000000_create_awg_tables.sql`, `lib/supabaseSync.ts`, `store/useFinanceStore.ts`, `components/Settings.tsx`, `App.tsx`

---

## Alteração anterior — 07/10/2026 às 02:40

## Alteração anterior — 07/10/2026 às 02:25

novo tipo de contato "Colaborador".
- Em Contatos → Adicionar/Editar, o tipo agora tem a opção **Colaborador** (ícone verde).
- Tela de Contatos ganhou abas de filtro: Todos, Clientes, Fornecedores, Colaboradores (com contagem).
- No lançamento de **despesa**, o campo virou "Fornecedor / Colaborador" e lista os colaboradores marcados como "(colaborador)" — útil para salários, comissões, vales. Em **receita**, aparecem só clientes.
- Em Contas a Pagar, o filtro de contato inclui colaboradores.

Arquivos alterados: `types.ts`, `lib/sanitize.ts`, `components/Entities.tsx`, `components/TransactionModal.tsx`, `components/BillsList.tsx`, `components/GlobalSearchModal.tsx`

## Alteração anterior — 07/10/2026 às 02:15

auditoria de segurança e correções. Relatório completo em `AUDITORIA_SEGURANCA_2026-10-07.md`.
- Duas abas abertas não apagam mais os dados uma da outra (sincronização entre abas).
- Backups e dados salvos são validados campo a campo (`lib/sanitize.ts`): arquivo malformado não derruba mais o sistema.
- CSV exportado neutraliza fórmulas maliciosas do Excel.
- Tela de recuperação em caso de erro, com botão "Baixar meus dados".
- Restaurar backup baixa antes uma cópia dos dados atuais.
- Limites de tamanho: importação 10 MB, logo 5 MB; logo só aceita imagem embutida.
- `vercel.json` com cabeçalhos de segurança (CSP, HSTS etc.) para a publicação.
- `vite.config.ts`: sem injeção de chave de API, servidor de desenvolvimento só em `localhost` (para abrir no celular: `npm run dev -- --host`).
- `backend/server.ts` bloqueado (era inseguro e não é usado).

Arquivos alterados: `lib/finance.ts`, `lib/utils.ts`, `store/useFinanceStore.ts`, `index.tsx`, `App.tsx`, `components/ImportModal.tsx`, `components/Settings.tsx`, `vite.config.ts`, `backend/server.ts`, `tests/logic.test.ts`
Arquivos novos: `lib/sanitize.ts`, `components/ErrorBoundary.tsx`, `vercel.json`, `AUDITORIA_SEGURANCA_2026-10-07.md`

## Alteração anterior — 07/10/2026 às 01:55

desfeita a exportação em PDF (a pedido).
- `components/Transactions.tsx` voltou exatamente à versão anterior (botão "Exportar" gera só o CSV).
- `lib/pdfReport.ts` foi removido.
- `jspdf` e `jspdf-autotable` foram retirados do `package.json`. Se você já tinha rodado `npm install`, rode de novo para limpar (opcional).

## Alteração anterior — 07/10/2026 às 01:00

histórico de importações e exclusão de lançamentos.
- Em Configurações, novo card **"Histórico de Importações"**: data, arquivo, conta, período do extrato, quantidade e total de entradas/saídas de cada extrato importado.
- Botão **"Desfazer"** em cada importação: apaga só os lançamentos criados por aquele extrato (avisa antes, inclusive quantos já foram classificados).
- Importações feitas antes desta versão foram reconstruídas automaticamente no histórico (pelo nome do arquivo gravado nos lançamentos).
- Novo card **"Excluir todos os lançamentos"**: exige digitar EXCLUIR, baixa um backup automaticamente e mantém contas, categorias, contatos e configurações.

Arquivos alterados: `types.ts`, `lib/finance.ts`, `store/useFinanceStore.ts`, `App.tsx`, `components/ImportModal.tsx`, `components/Settings.tsx`, `tests/logic.test.ts`
Arquivo novo: `components/ImportHistory.tsx`

## Alteração anterior — 07/10/2026 às 00:35

percentuais na DRE.
- Cada linha da DRE (grupos e categorias) mostra o % sobre a receita líquida, ao lado do valor.
- O resultado final mostra "xx% da receita líquida" (margem líquida).
- O CSV exportado da DRE ganhou a coluna "% da Receita Líquida".
- Sem receita líquida positiva no período, o percentual aparece como "—".

Arquivo alterado: `components/Reports.tsx`

## Alteração anterior — 07/10/2026 às 00:45

categorias ligadas ao centro de custo + plano de categorias completo.
- Cada categoria pode ser ligada a um ou mais centros de custo (em Categorias → editar → "Aparece nos centros de custo"; nenhum marcado = aparece em todos).
- No lançamento, a lista de categorias mostra só as do centro de custo escolhido, em ordem alfabética; o link "Mostrar todas" exibe a lista completa.
- Lançamento novo começa sem categoria: é obrigatório escolher (evita salvar na categoria errada).
- Adicionadas ~36 categorias para loja de material elétrico, com grupo da DRE e centros de custo. As categorias e lançamentos existentes não foram alterados.
- Novo grupo "Fora da DRE" (distribuição de lucros, empréstimos, aplicações): mexe no saldo, mas não no lucro.
- Extratos importados agora entram na categoria "A Classificar".
- Tela de Categorias: coluna e filtro por centro de custo.

Arquivos alterados: `types.ts`, `constants.tsx`, `App.tsx`, `lib/finance.ts`, `components/Categories.tsx`, `components/TransactionModal.tsx`, `components/ImportModal.tsx`, `components/Reports.tsx`, `components/Dashboard.tsx`, `tests/logic.test.ts`

## Alteração anterior — 06/10/2026 às 18:05

backup mais visível e com lembrete.
- Novo botão **"Fazer Backup"** no rodapé do menu lateral (acima de Configurações), mostrando a data do último backup.
- Aviso amarelo no topo da tela quando nunca foi feito backup ou o último tem mais de 7 dias, com botão "Fazer backup agora".
- Em Configurações, o card de backup mostra a data e hora do último backup.

Arquivos alterados: `App.tsx`, `types.ts`, `store/useFinanceStore.ts`, `components/Layout.tsx`, `components/Settings.tsx`

## Alteração anterior — 06/10/2026 às 17:39

Criação deste arquivo de registro.

## Alteração anterior — 03/10/2026 às 23:43

Correção geral de falhas do sistema:
- Datas exibidas com um dia a menos (problema de fuso horário)
- Botões laranja sem cor (tons faltando na paleta)
- Categoria errada em lançamentos novos; "Nova Receita" abrindo como despesa
- DRE: seleção de mês/ano e regime de caixa pela data do pagamento
- Parcelas (centavos e meses de 31 dias) e recorrência automática
- Edição de categorias/contatos, confirmação ao excluir, bloqueio de exclusão em uso
- Importação de extrato OFX/CSV sem duplicar
- Tailwind instalado no projeto (necessário para publicar online)

Arquivos novos: `lib/dates.ts`, `lib/finance.ts`, `components/BillsList.tsx`,
`components/Pagination.tsx`, `tests/logic.test.ts`, `index.css`,
`tailwind.config.js`, `postcss.config.js`

Código original salvo em: `_backup_antes_correcoes_2026-10-03/`
