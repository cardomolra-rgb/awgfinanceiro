// Validação dos dados que entram no sistema (dados salvos no navegador e backups importados).
// Um backup é um arquivo que pode ter sido editado à mão ou corrompido: nada nele é confiável.
// Cada campo é convertido para o tipo esperado, com limite de tamanho; campos desconhecidos são descartados.

import {
  Account, Category, CompanySettings, DREGroup, Entity, ImportRecord, PaymentMethod,
  RecurrenceRule, Transaction, TransactionStatus, TransactionType,
} from '../types';

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

export const str = (v: unknown, max = 200, fallback = ''): string => {
  if (typeof v === 'string') return v.slice(0, max);
  if (typeof v === 'number' && Number.isFinite(v)) return String(v).slice(0, max);
  return fallback;
};

const optStr = (v: unknown, max = 200): string | undefined => {
  const s = str(v, max);
  return s ? s : undefined;
};

const ID_RE = /^[A-Za-z0-9_.:-]{1,80}$/;
const optId = (v: unknown): string | undefined => (typeof v === 'string' && ID_RE.test(v) ? v : undefined);

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export const hexColor = (v: unknown, fallback: string): string => (typeof v === 'string' && HEX_RE.test(v) ? v : fallback);

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly unknown[]).includes(v) ? (v as T) : fallback;

const optOneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
  (allowed as readonly unknown[]).includes(v) ? (v as T) : undefined;

const money = (v: unknown, max = 1e12): number => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-max, Math.min(max, Math.round(n * 100) / 100));
};

const int = (v: unknown, min: number, max: number): number | undefined => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
};

/** Data/hora ISO válida (ou undefined). */
const isoDateTime = (v: unknown): string | undefined => {
  if (typeof v !== 'string' || v.length > 40) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
};

/** Data simples AAAA-MM-DD ou ISO (a normalização de fuso acontece depois). */
const dateStr = (v: unknown): string | undefined =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && v.length <= 40 ? v : undefined;

/** Só aceita logo embutido como imagem (data URL), nunca endereço externo (evita rastreamento). */
export const safeLogo = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length <= 2_000_000 && /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : undefined;

export const CURRENCIES = ['BRL', 'USD', 'EUR'] as const;

const TX_TYPES = [TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.TRANSFER] as const;
const PAY_METHODS = Object.values(PaymentMethod) as PaymentMethod[];
const PERIODS = ['MONTHLY', 'WEEKLY', 'YEARLY'] as const;
const CAT_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER', 'BOTH'] as const;
const DRE_GROUPS = Object.values(DREGroup) as DREGroup[];

/** Campos do lançamento (sem id/createdAt), usados também no modelo de recorrência. */
const txFields = (t: Record<string, any>) => ({
  type: oneOf(t.type, TX_TYPES, TransactionType.EXPENSE),
  description: str(t.description, 300, 'Sem descrição') || 'Sem descrição',
  amount: Math.abs(money(t.amount)),
  categoryId: str(t.categoryId, 80),
  accountId: str(t.accountId, 80),
  destinationAccountId: optId(t.destinationAccountId),
  entityId: optId(t.entityId),
  paymentMethod: oneOf(t.paymentMethod, PAY_METHODS, PaymentMethod.PIX),
  observations: optStr(t.observations, 1000),
  isRecurring: t.isRecurring === true,
  installmentsCount: int(t.installmentsCount, 1, 999),
  currentInstallment: int(t.currentInstallment, 1, 999),
  costCenter: optStr(t.costCenter, 80),
  recurrencePeriod: optOneOf(t.recurrencePeriod, PERIODS),
  recurrenceId: optId(t.recurrenceId),
  importId: optId(t.importId),
});

/** Lançamento com tipo inválido é descartado (não dá para adivinhar se era entrada ou saída). */
export const sanitizeTransaction = (t: unknown): Transaction | null => {
  if (!isObj(t) || !(TX_TYPES as readonly unknown[]).includes(t.type)) return null;
  return {
    ...txFields(t),
    id: optId(t.id) || '',
    accrualDate: dateStr(t.accrualDate) || '',
    dueDate: dateStr(t.dueDate) || '',
    paymentDate: dateStr(t.paymentDate),
    status: t.status === TransactionStatus.PAID ? TransactionStatus.PAID : TransactionStatus.PLANNED,
    createdAt: isoDateTime(t.createdAt) || '',
  } as Transaction;
};

export const sanitizeCategory = (c: unknown): Category | null => {
  if (!isObj(c)) return null;
  const id = optId(c.id);
  const name = str(c.name, 100).trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    type: oneOf(c.type, CAT_TYPES, 'EXPENSE') as Category['type'],
    color: hexColor(c.color, '#94a3b8'),
    dreGroup: optOneOf(c.dreGroup, DRE_GROUPS),
    parentId: optId(c.parentId),
    costCenters: Array.isArray(c.costCenters) ? c.costCenters.map(x => str(x, 80)).filter(Boolean).slice(0, 50) : undefined,
    icon: optStr(c.icon, 50),
  };
};

export const sanitizeAccount = (a: unknown): Account | null => {
  if (!isObj(a)) return null;
  const id = optId(a.id);
  if (!id) return null;
  const type = oneOf(a.type, ['CASH', 'BANK', 'CREDIT_CARD'] as const, 'BANK');
  return {
    id,
    name: str(a.name, 100).trim() || 'Conta sem nome',
    type,
    initialBalance: money(a.initialBalance),
    ...(type === 'CREDIT_CARD' ? {
      creditLimit: a.creditLimit !== undefined ? Math.abs(money(a.creditLimit)) : undefined,
      closingDay: int(a.closingDay, 1, 31),
      dueDay: int(a.dueDay, 1, 31),
    } : {}),
  };
};

export const sanitizeEntity = (e: unknown): Entity | null => {
  if (!isObj(e)) return null;
  const id = optId(e.id);
  if (!id) return null;
  return {
    id,
    name: str(e.name, 150).trim() || 'Contato sem nome',
    type: oneOf(e.type, ['CLIENT', 'SUPPLIER', 'BOTH', 'EMPLOYEE'] as const, 'CLIENT'),
    email: optStr(e.email, 150),
    phone: optStr(e.phone, 40),
  };
};

export const sanitizeSettings = (s: unknown, defaults: CompanySettings): CompanySettings => {
  const v = isObj(s) ? s : {};
  return {
    name: str(v.name, 100).trim() || defaults.name,
    logoUrl: safeLogo(v.logoUrl),
    primaryColor: hexColor(v.primaryColor, defaults.primaryColor),
    secondaryColor: hexColor(v.secondaryColor, defaults.secondaryColor),
    accentColor: hexColor(v.accentColor, defaults.accentColor),
    currency: oneOf(v.currency, CURRENCIES, 'BRL'),
    footerText: str(v.footerText, 300, defaults.footerText),
    theme: v.theme === 'dark' ? 'dark' : 'light',
    lastBackupAt: isoDateTime(v.lastBackupAt),
  };
};

export const sanitizeRule = (r: unknown): RecurrenceRule | null => {
  if (!isObj(r) || !isObj(r.template)) return null;
  const id = optId(r.id);
  const startDate = dateStr(r.startDate);
  const generatedCount = int(r.generatedCount, 0, 100000);
  if (!id || !startDate || generatedCount === undefined) return null;
  return {
    id,
    period: oneOf(r.period, PERIODS, 'MONTHLY'),
    startDate: startDate.slice(0, 10),
    generatedCount,
    active: r.active === true,
    template: txFields(r.template) as RecurrenceRule['template'],
  };
};

export const sanitizeImportRecord = (r: unknown): ImportRecord | null => {
  if (!isObj(r)) return null;
  const id = optId(r.id);
  const importedAt = isoDateTime(r.importedAt);
  if (!id || !importedAt) return null;
  return {
    id,
    importedAt,
    fileName: str(r.fileName, 200, 'arquivo'),
    accountId: str(r.accountId, 80),
    count: int(r.count, 0, 1_000_000) ?? 0,
    duplicates: int(r.duplicates, 0, 1_000_000) ?? 0,
    totalIncome: Math.abs(money(r.totalIncome)),
    totalExpense: Math.abs(money(r.totalExpense)),
    periodStart: dateStr(r.periodStart)?.slice(0, 10),
    periodEnd: dateStr(r.periodEnd)?.slice(0, 10),
    undoneAt: isoDateTime(r.undoneAt),
    removedCount: int(r.removedCount, 0, 1_000_000),
  };
};

/** Aplica um sanitizador a uma lista, descartando itens inválidos e IDs repetidos. */
export const sanitizeList = <T extends { id: string }>(list: unknown, fn: (x: unknown) => T | null, max = 200_000): T[] => {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of list.slice(0, max)) {
    const v = fn(item);
    if (!v) continue;
    if (v.id && seen.has(v.id)) continue;
    if (v.id) seen.add(v.id);
    out.push(v);
  }
  return out;
};
