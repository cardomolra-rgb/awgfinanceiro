// Utilitários de data.
// As datas do sistema são guardadas como "AAAA-MM-DD" (sem horário).
// `new Date("2026-10-01")` interpreta a string em UTC, o que no Brasil (UTC-3)
// vira 30/09 às 21h. Por isso toda leitura de data deve passar por parseDate().

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Converte "AAAA-MM-DD" (ou ISO com horário) em Date local à meia-noite. */
export const parseDate = (value?: string | null): Date => {
  if (!value) return new Date(NaN);
  const m = DATE_ONLY.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  if (isNaN(d.getTime())) return d;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Converte um Date em "AAAA-MM-DD" usando o fuso local. */
export const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Data de hoje em "AAAA-MM-DD" (fuso local). */
export const todayISO = (): string => toISODate(new Date());

/** Hoje à meia-noite (fuso local). */
export const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Normaliza qualquer data salva para "AAAA-MM-DD"; devolve undefined se inválida. */
export const normalizeISODate = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const d = parseDate(value);
  return isNaN(d.getTime()) ? undefined : toISODate(d);
};

/** Formata para exibição: "dd/mm/aaaa". */
export const formatDate = (value?: string | null): string => {
  const d = parseDate(value);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
};

/**
 * Soma meses mantendo o dia quando possível e ajustando para o último dia do mês
 * quando ele não existe (31/01 + 1 mês = 28/02, e não 03/03).
 */
export const addMonths = (iso: string, months: number): string => {
  const base = parseDate(iso);
  const day = base.getDate();
  const target = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toISODate(target);
};

export const addDays = (iso: string, days: number): string => {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

/** Mesmo mês/ano? */
export const isSameMonth = (iso: string | undefined, month: number, year: number): boolean => {
  const d = parseDate(iso);
  return !isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year;
};

export const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MONTH_NAMES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
