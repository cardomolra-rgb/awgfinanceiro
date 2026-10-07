import { todayISO } from './lib/dates';
import { TransactionType, Category, Account, CompanySettings, TransactionStatus, PaymentMethod, DREGroup } from './types';

export const DEFAULT_COST_CENTRES: string[] = [
  'Operacional',
  'Marketing & Vendas',
  'Administrativo',
  'Tecnologia / TI',
  'Projetos Especiais'
];

// Centros de custo (nomes usados para ligar categorias)
const OP = 'Operacional';
const MKT = 'Marketing & Vendas';
const ADM = 'Administrativo';
const TI = 'Tecnologia / TI';

/** Categoria usada nos lançamentos importados de extrato até serem classificados. */
export const UNCLASSIFIED_CATEGORY_ID = 'c-a-classificar';

const cat = (id: string, name: string, type: Category['type'], color: string, dreGroup: DREGroup | undefined, costCenters: string[] = []): Category =>
  ({ id, name, type, color, dreGroup, costCenters });

const I = TransactionType.INCOME;
const E = TransactionType.EXPENSE;

/**
 * Plano de categorias de uma loja de material elétrico.
 * `costCenters` vazio = aparece em todos os centros de custo.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  // Receitas
  cat('1', 'Vendas de Produtos', I, '#10b981', DREGroup.REVENUE),
  cat('c-vendas-prazo', 'Vendas a Prazo / Crediário', I, '#059669', DREGroup.REVENUE),
  cat('c-vendas-obras', 'Vendas para Empresas e Obras', I, '#047857', DREGroup.REVENUE),
  cat('2', 'Prestação de Serviços', I, '#3b82f6', DREGroup.REVENUE),
  cat('c-rec-financeiras', 'Receitas Financeiras', I, '#0ea5e9', DREGroup.REVENUE),
  cat('c-outras-receitas', 'Outras Receitas', I, '#14b8a6', DREGroup.REVENUE),
  cat('c-emprestimo-recebido', 'Empréstimo Recebido', I, '#94a3b8', DREGroup.EXCLUDED),
  cat('c-aporte-socios', 'Aporte dos Sócios', I, '#94a3b8', DREGroup.EXCLUDED),
  cat('c-resgate', 'Resgate de Aplicação', I, '#94a3b8', DREGroup.EXCLUDED),

  // Impostos e deduções
  cat('5', 'DAS / Simples Nacional', E, '#6366f1', DREGroup.TAXES, [ADM]),
  cat('c-icms-antecipado', 'ICMS Antecipado / DIFAL', E, '#4f46e5', DREGroup.TAXES, [OP, ADM]),
  cat('c-devolucoes', 'Devoluções e Estornos de Vendas', E, '#818cf8', DREGroup.TAXES, [MKT]),
  cat('c-taxa-cartao', 'Taxas de Cartão / Maquininha', E, '#a5b4fc', DREGroup.TAXES, [MKT, ADM]),

  // Custos operacionais (custo do que é vendido)
  cat('c-mercadorias', 'Compra de Mercadorias para Revenda', E, '#8b5cf6', DREGroup.OPERATIVE_COST, [OP]),
  cat('7', 'Compra de Insumos', E, '#a78bfa', DREGroup.OPERATIVE_COST, [OP]),
  cat('c-frete-compras', 'Frete sobre Compras', E, '#7c3aed', DREGroup.OPERATIVE_COST, [OP]),
  cat('c-embalagens', 'Embalagens e Sacolas', E, '#c4b5fd', DREGroup.OPERATIVE_COST, [OP]),
  cat('c-comissoes', 'Comissões de Vendedores', E, '#6d28d9', DREGroup.OPERATIVE_COST, [MKT]),

  // Despesas administrativas
  cat('3', 'Salários e Encargos', E, '#ef4444', DREGroup.ADMIN_EXPENSE, [OP, ADM]),
  cat('c-prolabore', 'Pró-labore', E, '#dc2626', DREGroup.ADMIN_EXPENSE, [ADM]),
  cat('c-beneficios', 'Vale-transporte / Alimentação', E, '#f87171', DREGroup.ADMIN_EXPENSE, [OP, ADM]),
  cat('4', 'Aluguel e Condomínio', E, '#f59e0b', DREGroup.ADMIN_EXPENSE, [OP, ADM]),
  cat('c-energia', 'Energia Elétrica', E, '#fbbf24', DREGroup.ADMIN_EXPENSE, [OP, ADM]),
  cat('c-agua', 'Água', E, '#38bdf8', DREGroup.ADMIN_EXPENSE, [OP, ADM]),
  cat('c-internet', 'Internet e Telefone', E, '#22d3ee', DREGroup.ADMIN_EXPENSE, [ADM, TI]),
  cat('c-contador', 'Contador / Honorários Contábeis', E, '#f97316', DREGroup.ADMIN_EXPENSE, [ADM]),
  cat('c-sistemas', 'Sistemas e Softwares', E, '#06b6d4', DREGroup.ADMIN_EXPENSE, [TI, ADM]),
  cat('c-escritorio', 'Material de Escritório e Limpeza', E, '#fb923c', DREGroup.ADMIN_EXPENSE, [ADM, OP]),
  cat('c-manutencao', 'Manutenção e Reparos', E, '#ea580c', DREGroup.ADMIN_EXPENSE, [OP, ADM, TI]),
  cat('c-veiculos', 'Combustível e Veículos', E, '#d97706', DREGroup.ADMIN_EXPENSE, [OP]),
  cat('c-seguros', 'Seguros', E, '#b45309', DREGroup.ADMIN_EXPENSE, [ADM]),
  cat('c-tarifas', 'Tarifas Bancárias', E, '#92400e', DREGroup.ADMIN_EXPENSE, [ADM]),

  // Marketing
  cat('6', 'Anúncios / Tráfego', E, '#ec4899', DREGroup.MARKETING, [MKT]),
  cat('c-grafica', 'Material Gráfico e Fachada', E, '#f472b6', DREGroup.MARKETING, [MKT]),
  cat('c-brindes', 'Brindes e Patrocínios', E, '#db2777', DREGroup.MARKETING, [MKT]),

  // Outras despesas
  cat('c-juros-multas', 'Juros e Multas', E, '#64748b', DREGroup.OTHER, [ADM]),
  cat('c-juros-emprestimos', 'Juros de Empréstimos e Financiamentos', E, '#475569', DREGroup.OTHER, [ADM]),
  cat('c-diversas', 'Despesas Diversas', E, '#94a3b8', DREGroup.OTHER),

  // Fora da DRE (mexem no caixa, mas não são receita/despesa)
  cat('c-distribuicao-lucros', 'Distribuição de Lucros aos Sócios', E, '#94a3b8', DREGroup.EXCLUDED, [ADM]),
  cat('c-pagto-emprestimo', 'Pagamento de Empréstimo (principal)', E, '#94a3b8', DREGroup.EXCLUDED, [ADM]),
  cat('c-aplicacao', 'Aplicação Financeira', E, '#94a3b8', DREGroup.EXCLUDED, [ADM]),

  // Classificação pendente (importações de extrato)
  cat(UNCLASSIFIED_CATEGORY_ID, 'A Classificar', 'BOTH', '#facc15', undefined),

  // Transferência entre contas (usada automaticamente)
  cat('8', 'Transferência Entre Contas', TransactionType.TRANSFER, '#64748b', DREGroup.OTHER),
];

/** Versão do plano de categorias acima; aumentar quando novas categorias sugeridas forem adicionadas. */
export const CATEGORIES_SEED_VERSION = 1;

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'a1', name: 'Caixa Geral', type: 'CASH', initialBalance: 1500 },
  { id: 'a2', name: 'Conta Corrente PJ', type: 'BANK', initialBalance: 10000 },
  { id: 'a3', name: 'Reserva de Emergência', type: 'BANK', initialBalance: 5000 },
  { id: 'a4', name: 'Cartão Corporativo', type: 'CREDIT_CARD', initialBalance: 0, creditLimit: 15000, closingDay: 25, dueDay: 5 }
];

export const DEFAULT_SETTINGS: CompanySettings = {
  name: 'Moura Mat. Elétricos',
  primaryColor: '#F05523',
  secondaryColor: '#FDB813',
  accentColor: '#58585A',
  currency: 'BRL',
  footerText: 'Moura Materiais Elétricos - Gestão Financeira',
  theme: 'light'
};

export const MOCK_TRANSACTIONS: any[] = [
  {
    id: 't1',
    type: TransactionType.INCOME,
    description: 'Faturamento Projeto Alpha',
    amount: 12000.00,
    accrualDate: todayISO(),
    dueDate: todayISO(),
    paymentDate: todayISO(),
    categoryId: '2',
    accountId: 'a2',
    paymentMethod: PaymentMethod.TRANSFER,
    status: TransactionStatus.PAID,
    costCenter: 'Operacional',
    createdAt: new Date().toISOString()
  },
  {
    id: 't2',
    type: TransactionType.EXPENSE,
    description: 'Pagamento Google Ads (1/3)',
    amount: 1500.00,
    accrualDate: todayISO(),
    dueDate: todayISO(),
    paymentDate: todayISO(),
    categoryId: '6',
    accountId: 'a4',
    paymentMethod: PaymentMethod.CREDIT_CARD,
    status: TransactionStatus.PAID,
    installmentsCount: 3,
    currentInstallment: 1,
    costCenter: 'Marketing & Vendas',
    createdAt: new Date().toISOString()
  },
  {
    id: 't3',
    type: TransactionType.TRANSFER,
    description: 'Transferência para Reserva de Emergência',
    amount: 2000.00,
    accrualDate: todayISO(),
    dueDate: todayISO(),
    paymentDate: todayISO(),
    categoryId: '8',
    accountId: 'a2',
    destinationAccountId: 'a3',
    paymentMethod: PaymentMethod.TRANSFER,
    status: TransactionStatus.PAID,
    costCenter: 'Administrativo',
    createdAt: new Date().toISOString()
  }
];
