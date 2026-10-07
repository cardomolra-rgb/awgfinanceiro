# AwgFinanceiro — Gestão Financeira (Moura Mat. Elétricos)

Sistema de controle financeiro para pequenas e médias empresas: fluxo de caixa, contas a pagar/receber,
contas bancárias e cartões, categorias com DRE, contatos e relatórios.

## Funcionalidades
- **Dashboard**: saldo, a receber/a pagar do período, contas atrasadas e a vencer em 7 dias, evolução do caixa.
- **Lançamentos**: receitas, despesas e transferências; parcelamento (sem perder centavos e mantendo o dia do vencimento);
  lançamentos **recorrentes** (mensal/semanal/anual) que geram automaticamente as próximas ocorrências.
- **Contas a Pagar / a Receber**: em aberto, atrasados e pagos, com baixa rápida (data de pagamento = hoje).
- **Contas & Bancos**: saldo calculado pelos lançamentos pagos; ajuste de saldo; limite disponível do cartão.
- **Categorias**: cada categoria pertence a um grupo da DRE (receita, impostos, custos, administrativas, marketing, outras).
- **Relatórios**: DRE por mês/ano, regime de **Caixa** (data do pagamento) ou **Competência**; exportação CSV (Excel) e impressão em PDF.
- **Importação**: extrato bancário **OFX** ou **CSV** (formato brasileiro, ignora lançamentos repetidos) e restauração de backup **JSON**.

## Onde ficam os dados
Os dados são salvos **no navegador** (localStorage) do computador em uso. Se o cache do navegador for limpo, os dados
são perdidos. **Baixe um backup em Configurações → Baixar Backup** com frequência.

## Como rodar
Pré-requisito: Node.js 18+.

```bash
npm install
npm run dev        # abre em http://localhost:3000
```

Outros comandos:

```bash
npm run build      # gera a versão de produção em dist/
npm run preview    # serve a versão de produção localmente
npm run typecheck  # verificação de tipos (TypeScript)
npm test           # testes das regras de cálculo (datas, parcelas, recorrência, importação)
```

## Estrutura
- `App.tsx` — navegação e regras de exclusão/confirmação
- `store/useFinanceStore.ts` — estado e persistência
- `lib/dates.ts` — datas sem problema de fuso horário
- `lib/finance.ts` — saldos, parcelas, recorrências, migração de dados antigos
- `components/` — telas
- `tests/logic.test.ts` — testes

> A pasta `backend/` é um rascunho antigo (Express + Prisma) e **não é usada** pelo sistema.
