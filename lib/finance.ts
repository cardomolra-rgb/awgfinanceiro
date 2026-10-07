import {
  AppState, Transaction, TransactionStatus, TransactionType, RecurrenceRule, RecurrencePeriod,
} from '../types';
import { addDays, addMonths, normalizeISODate, parseDate, startOfToday, todayISO, toISODate } from './dates';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, DEFAULT_SETTINGS, DEFAULT_COST_CENTRES, CATEGORIES_SEED_VERSION } from '../constants';
import { Category, ImportRecord } from '../types';
import {
  sanitizeAccount, sanitizeCategory, sanitizeEntity, sanitizeImportRecord, sanitizeList,
  sanitizeRule, sanitizeSettings, sanitizeTransaction, str,
} from './sanitize';

/** ID único (evita colisões do Math.random). */
export const generateId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch { /* ignora */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/** Arredonda para centavos evitando erros de ponto flutuante. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Data de vencimento efetiva. */
export const dueDateOf = (t: Transaction): string => t.dueDate || t.accrualDate;

/** Data em que o dinheiro efetivamente entrou/saiu (para regime de caixa). */
export const cashDateOf = (t: Transaction): string => t.paymentDate || t.dueDate || t.accrualDate;

export const isPaid = (t: Transaction): boolean => t.status === TransactionStatus.PAID;

/** Em aberto e com vencimento anterior a hoje. Vencendo hoje NÃO é atraso. */
export const isOverdue = (t: Transaction, today: Date = startOfToday()): boolean =>
  !isPaid(t) && parseDate(dueDateOf(t)) < today;

/** Divide um valor em N parcelas cuja soma é exatamente o total (a última absorve os centavos). */
export const splitInstallments = (total: number, count: number): number[] => {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const values = Array.from({ length: count }, () => base);
  values[count - 1] += cents - base * count;
  return values.map(v => v / 100);
};

// ---------------------------------------------------------------------------
// Recorrência
// ---------------------------------------------------------------------------

/** Quantos dias à frente as recorrências são geradas (deixa o mês seguinte visível em Contas a Pagar). */
export const RECURRENCE_HORIZON_DAYS = 45;

export const nthOccurrenceDate = (startDate: string, period: RecurrencePeriod, n: number): string => {
  if (period === 'WEEKLY') return addDays(startDate, 7 * n);
  if (period === 'YEARLY') return addMonths(startDate, 12 * n);
  return addMonths(startDate, n);
};

/**
 * Cria as ocorrências que faltam de cada regra ativa até hoje + horizonte.
 * Datas são calculadas sempre a partir da data inicial, então não "escorregam"
 * (ex.: dia 31 continua 31 nos meses que têm 31 dias).
 */
export const applyRecurrences = (state: AppState, today: string = todayISO()): AppState => {
  const limit = addDays(today, RECURRENCE_HORIZON_DAYS);
  let changed = false;
  const newTransactions: Transaction[] = [];

  const recurrences = state.recurrences.map(rule => {
    if (!rule.active) return rule;
    let count = rule.generatedCount;
    let next = nthOccurrenceDate(rule.startDate, rule.period, count);
    let guard = 0;
    while (next <= limit && guard < 500) {
      newTransactions.push({
        ...rule.template,
        id: generateId(),
        accrualDate: next,
        dueDate: next,
        status: TransactionStatus.PLANNED,
        isRecurring: true,
        recurrencePeriod: rule.period,
        recurrenceId: rule.id,
        createdAt: new Date().toISOString(),
      });
      count++;
      guard++;
      next = nthOccurrenceDate(rule.startDate, rule.period, count);
    }
    if (count !== rule.generatedCount) {
      changed = true;
      return { ...rule, generatedCount: count };
    }
    return rule;
  });

  if (!changed) return state;
  return { ...state, recurrences, transactions: [...state.transactions, ...newTransactions] };
};

/** Monta uma regra a partir do primeiro lançamento (que já existe e conta como ocorrência nº 0). */
export const createRuleFrom = (t: Transaction): RecurrenceRule => {
  const {
    id: _id, createdAt: _c, status: _s, paymentDate: _p, accrualDate: _a, dueDate: _d,
    ...template
  } = t;
  const period = t.recurrencePeriod || 'MONTHLY';
  const startDate = dueDateOf(t);
  // Se o lançamento-base for antigo, não recria os meses passados: começa da próxima data a partir de hoje.
  let generatedCount = 1;
  const today = todayISO();
  while (nthOccurrenceDate(startDate, period, generatedCount) < today && generatedCount < 1000) generatedCount++;
  return {
    id: generateId(),
    period,
    startDate,
    generatedCount,
    active: true,
    template: { ...template, isRecurring: true },
  };
};

// ---------------------------------------------------------------------------
// Normalização / migração de dados salvos
// ---------------------------------------------------------------------------

const normalizeTransaction = (t: any): Transaction => {
  const accrualDate = normalizeISODate(t.accrualDate) || normalizeISODate(t.dueDate) || todayISO();
  const dueDate = normalizeISODate(t.dueDate) || accrualDate;
  let status: TransactionStatus = t.status === TransactionStatus.PAID ? TransactionStatus.PAID : TransactionStatus.PLANNED;
  let paymentDate = normalizeISODate(t.paymentDate);
  if (status === TransactionStatus.PAID && !paymentDate) paymentDate = dueDate;
  if (status !== TransactionStatus.PAID) paymentDate = undefined;
  return {
    ...t,
    id: t.id || generateId(), // t já passou por sanitizeTransaction (só campos conhecidos)
    amount: round2(Number(t.amount) || 0),
    accrualDate,
    dueDate,
    paymentDate,
    status,
    createdAt: t.createdAt || new Date().toISOString(),
  };
};

/** Garante que dados antigos / importados tenham o formato esperado. */
export const normalizeState = (rawInput: any): AppState => {
  // 1) Validação: só entram campos conhecidos, com tipo e tamanho corretos
  const isObj = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v);
  const input = isObj(rawInput) ? rawInput : {};
  const raw: any = {
    ...input,
    transactions: Array.isArray(input.transactions) ? sanitizeList(input.transactions, sanitizeTransaction) : undefined,
    categories: Array.isArray(input.categories) ? sanitizeList(input.categories, sanitizeCategory) : undefined,
    accounts: Array.isArray(input.accounts) ? sanitizeList(input.accounts, sanitizeAccount) : undefined,
    entities: Array.isArray(input.entities) ? sanitizeList(input.entities, sanitizeEntity) : undefined,
    recurrences: Array.isArray(input.recurrences) ? sanitizeList(input.recurrences, sanitizeRule) : undefined,
    importHistory: Array.isArray(input.importHistory) ? sanitizeList(input.importHistory, sanitizeImportRecord) : undefined,
    costCenters: Array.isArray(input.costCenters)
      ? [...new Set(input.costCenters.map((c: unknown) => str(c, 80).trim()).filter(Boolean))].slice(0, 100)
      : undefined,
    categoriesSeedVersion: Number.isInteger(input.categoriesSeedVersion) ? input.categoriesSeedVersion : undefined,
  };
  if (raw.categories && raw.categories.length === 0) raw.categories = undefined;
  if (raw.accounts && raw.accounts.length === 0) raw.accounts = undefined;

  const settings = sanitizeSettings(input.settings, DEFAULT_SETTINGS);
  // Migração de cor antiga (azul) para a identidade Moura
  if (settings.primaryColor === '#2563eb') {
    settings.name = DEFAULT_SETTINGS.name;
    settings.primaryColor = DEFAULT_SETTINGS.primaryColor;
    settings.secondaryColor = DEFAULT_SETTINGS.secondaryColor;
  }

  let transactions: any[] = Array.isArray(raw?.transactions) ? raw.transactions : [];
  // Remove lançamentos de uma importação antiga de extrato que foi descartada
  transactions = transactions.filter((t: any) => !t?.id?.startsWith?.('sicredi_') && !t?.id?.startsWith?.('extrato_'));

  // Categorias: em dados antigos, acrescenta as categorias sugeridas que faltam (sem mexer nas existentes)
  let categories: Category[] = Array.isArray(raw?.categories) ? raw.categories : DEFAULT_CATEGORIES;
  if (Array.isArray(raw?.categories) && (raw?.categoriesSeedVersion || 0) < CATEGORIES_SEED_VERSION) {
    const norm = (s: string) => (s || '').trim().toLowerCase();
    categories = categories.map(c => {
      const def = DEFAULT_CATEGORIES.find(d => d.id === c.id && norm(d.name) === norm(c.name));
      return def && !c.costCenters ? { ...c, costCenters: def.costCenters } : c;
    });
    const ids = new Set(categories.map(c => c.id));
    const names = new Set(categories.map(c => norm(c.name)));
    DEFAULT_CATEGORIES.forEach(def => {
      if (!ids.has(def.id) && !names.has(norm(def.name))) categories.push(def);
    });
  }

  const costCenters: string[] = Array.isArray(raw?.costCenters) && raw.costCenters.length ? [...raw.costCenters] : [...DEFAULT_COST_CENTRES];
  categories.forEach(c => (c.costCenters || []).forEach(cc => { if (!costCenters.includes(cc)) costCenters.push(cc); }));

  let normalizedTx = transactions.map(normalizeTransaction);

  // Histórico de importações. Em dados antigos, reconstrói a partir dos lançamentos
  // marcados "Importado de <arquivo>" (mesmo arquivo + conta + horário = mesma importação).
  let importHistory: ImportRecord[] = Array.isArray(raw?.importHistory) ? raw.importHistory : [];
  if (!Array.isArray(raw?.importHistory)) {
    const groups = new Map<string, Transaction[]>();
    normalizedTx.forEach(t => {
      const m = /^Importado de (.+)$/.exec(t.observations || '');
      if (!m || t.importId) return;
      const key = `${m[1]}|${t.accountId}|${(t.createdAt || '').slice(0, 16)}`;
      groups.set(key, [...(groups.get(key) || []), t]);
    });
    const idByTx = new Map<string, string>();
    groups.forEach((list, key) => {
      const id = `imp-${generateId()}`;
      const dates = list.map(t => t.accrualDate).sort();
      list.forEach(t => idByTx.set(t.id, id));
      importHistory.push({
        id,
        importedAt: list[0].createdAt,
        fileName: key.split('|')[0],
        accountId: list[0].accountId,
        count: list.length,
        duplicates: 0,
        totalIncome: round2(list.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0)),
        totalExpense: round2(list.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0)),
        periodStart: dates[0],
        periodEnd: dates[dates.length - 1],
      });
    });
    if (idByTx.size) normalizedTx = normalizedTx.map(t => idByTx.has(t.id) ? { ...t, importId: idByTx.get(t.id) } : t);
    importHistory.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  }

  return {
    transactions: normalizedTx,
    importHistory,
    categories,
    accounts: Array.isArray(raw?.accounts) ? raw.accounts : DEFAULT_ACCOUNTS,
    entities: Array.isArray(raw?.entities) ? raw.entities : [],
    settings,
    costCenters,
    recurrences: Array.isArray(raw?.recurrences) ? raw.recurrences : [],
    categoriesSeedVersion: CATEGORIES_SEED_VERSION,
  };
};

/** Saldo de cada conta = saldo inicial + entradas pagas − saídas pagas ± transferências pagas. */
export const computeAccountBalance = (accountId: string, initialBalance: number, transactions: Transaction[]): number => {
  let balance = initialBalance;
  for (const t of transactions) {
    if (!isPaid(t)) continue;
    if (t.type === TransactionType.INCOME && t.accountId === accountId) balance += t.amount;
    else if (t.type === TransactionType.EXPENSE && t.accountId === accountId) balance -= t.amount;
    else if (t.type === TransactionType.TRANSFER) {
      if (t.accountId === accountId) balance -= t.amount;
      if (t.destinationAccountId === accountId) balance += t.amount;
    }
  }
  return round2(balance);
};

export { toISODate };
