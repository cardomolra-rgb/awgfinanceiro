export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER'
}

export enum TransactionStatus {
  PLANNED = 'PLANNED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE'
}

export enum PaymentMethod {
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  TRANSFER = 'TRANSFER'
}

export enum DREGroup {
  REVENUE = 'REVENUE',
  TAXES = 'TAXES',
  OPERATIVE_COST = 'OPERATIVE',
  ADMIN_EXPENSE = 'ADMIN',
  MARKETING = 'MARKETING',
  OTHER = 'OTHER',
  EXCLUDED = 'EXCLUDED' // Não entra na DRE (sócios, empréstimos, aplicações)
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType | 'BOTH';
  color: string;
  icon?: string;
  dreGroup?: DREGroup;
  parentId?: string;
  costCenters?: string[]; // Centros de custo onde a categoria aparece (vazio = todos)
}

export interface Account {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'CREDIT_CARD';
  initialBalance: number;
  balance?: number;
  // Gestão de Cartão de Crédito
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
}

export interface Entity {
  id: string;
  name: string;
  type: 'CLIENT' | 'SUPPLIER' | 'BOTH' | 'EMPLOYEE';
  email?: string;
  phone?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  accrualDate: string;
  dueDate: string;
  paymentDate?: string;
  categoryId: string;
  accountId: string;
  destinationAccountId?: string; // Para Transferência entre contas
  entityId?: string; // Vínculo com Contato
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  observations?: string;
  isRecurring?: boolean; // Lançamento fixo
  // Parcelamento & Centro de Custo
  installmentsCount?: number; // Total de parcelas (ex: 6)
  currentInstallment?: number; // Parcela atual (ex: 1)
  costCenter?: string; // Centro de Custo / Projeto
  recurrencePeriod?: RecurrencePeriod;
  recurrenceId?: string; // Regra de recorrência que gerou este lançamento
  importId?: string;     // Importação de extrato que criou este lançamento
  createdAt: string;
}

export type RecurrencePeriod = 'MONTHLY' | 'WEEKLY' | 'YEARLY';

/** Regra que gera automaticamente as próximas ocorrências de um lançamento fixo. */
export interface RecurrenceRule {
  id: string;
  period: RecurrencePeriod;
  startDate: string;       // Vencimento da 1ª ocorrência (AAAA-MM-DD)
  generatedCount: number;  // Quantas ocorrências já foram criadas
  active: boolean;
  template: Omit<Transaction, 'id' | 'createdAt' | 'status' | 'paymentDate' | 'accrualDate' | 'dueDate'>;
}

export interface CompanySettings {
  name: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  currency: string;
  footerText: string;
  theme: 'light' | 'dark';
  lastBackupAt?: string; // Data/hora do último backup baixado (ISO)
}

export interface AppState {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  entities: Entity[];
  settings: CompanySettings;
  costCenters: string[];
  recurrences: RecurrenceRule[];
  categoriesSeedVersion?: number; // Controle de categorias sugeridas já adicionadas
  importHistory: ImportRecord[];
}

/** Registro de uma importação de extrato (OFX/CSV). */
export interface ImportRecord {
  id: string;
  importedAt: string;     // data/hora da importação (ISO)
  fileName: string;
  accountId: string;
  count: number;          // lançamentos criados
  duplicates: number;     // linhas ignoradas por já existirem
  totalIncome: number;
  totalExpense: number;
  periodStart?: string;   // primeira data do extrato (AAAA-MM-DD)
  periodEnd?: string;     // última data do extrato
  undoneAt?: string;      // preenchido quando a importação foi desfeita
  removedCount?: number;  // quantos lançamentos foram apagados ao desfazer
}
