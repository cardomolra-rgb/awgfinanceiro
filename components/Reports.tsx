
import React, { useMemo, useState } from 'react';
import { formatCurrency, downloadCSV, formatNumberBR } from '../lib/utils';
import { MONTH_NAMES, MONTH_NAMES_FULL, parseDate, toISODate } from '../lib/dates';
import { cashDateOf, isPaid } from '../lib/finance';
import {
  Printer, Download, TrendingUp, TrendingDown,
  BarChart2, PieChart as PieIcon, Lightbulb,
  ArrowRight, FileText, Activity, FileSpreadsheet, Info, ChevronDown, ChevronRight, Calendar, Filter
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart,
  Pie, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Transaction, TransactionType, Category, TransactionStatus, DREGroup } from '../types';

interface ReportsProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: any[];
  settings: any;
}

const Reports: React.FC<ReportsProps> = ({ transactions, categories, accounts, settings }) => {
  // Filter state
  const [dateFilter, setDateFilter] = useState<'ALL' | 'MONTH' | 'YEAR'>('MONTH');
  const [regime, setRegime] = useState<'CAIXA' | 'COMPETENCIA'>('CAIXA');
  const [customMonth, setCustomMonth] = useState(new Date().getMonth());
  const [customYear, setCustomYear] = useState(new Date().getFullYear());

  // Data que vale para o regime escolhido: caixa = data do pagamento; competência = data do fato gerador
  const refDate = (t: Transaction) => regime === 'CAIXA' ? cashDateOf(t) : t.accrualDate;

  const inPeriod = (iso: string) => {
    if (dateFilter === 'ALL') return true;
    const d = parseDate(iso);
    if (dateFilter === 'YEAR') return d.getFullYear() === customYear;
    return d.getMonth() === customMonth && d.getFullYear() === customYear;
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (regime === 'CAIXA' && !isPaid(t)) return false; // caixa = só o que foi pago/recebido
      return inPeriod(refDate(t));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, dateFilter, customMonth, customYear, regime]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    transactions.forEach(t => {
      [t.accrualDate, t.paymentDate, t.dueDate].forEach(d => { const y = parseDate(d).getFullYear(); if (!isNaN(y)) years.add(y); });
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Helper to build category tree with values
  const getCategoryBreakdown = (group: DREGroup, type: TransactionType = TransactionType.EXPENSE) => {
    // 1. Find all categories in this group
    const groupCategories = categories.filter(c => c.dreGroup === group);

    // 2. Calculate totals for each category
    const breakdown = groupCategories.map(cat => {
      const value = filteredTransactions
        .filter(t => t.categoryId === cat.id && t.type === type)
        .reduce((sum, t) => sum + t.amount, 0);
      return { ...cat, value };
    });

    // 3. Build tree (Parent -> Children)
    const roots = breakdown.filter(c => !c.parentId);
    const tree = roots.map(root => {
      const children = breakdown.filter(c => c.parentId === root.id);
      const selfValue = root.value;
      const childrenValue = children.reduce((sum, c) => sum + c.value, 0);
      return {
        ...root,
        value: selfValue + childrenValue,
        children: children.length > 0 ? children : undefined
      };
    }).filter(node => node.value > 0).sort((a, b) => b.value - a.value);

    const total = tree.reduce((sum, node) => sum + node.value, 0);

    return { tree, total };
  };

  const dre = useMemo(() => {
    // Revenue Detail
    const revenueData = getCategoryBreakdown(DREGroup.REVENUE, TransactionType.INCOME);

    // Catch any income not explicitly categorized as REVENUE (to ensure accuracy)
    const otherIncomeTotal = filteredTransactions
      .filter(t => {
        if (t.type !== TransactionType.INCOME) return false;
        const cat = categories.find(c => c.id === t.categoryId);
        if (cat?.dreGroup === DREGroup.EXCLUDED) return false; // sócios, empréstimos: fora da DRE
        return !cat || cat.dreGroup !== DREGroup.REVENUE;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const receitaBruta = revenueData.total + otherIncomeTotal;

    const impostosData = getCategoryBreakdown(DREGroup.TAXES);
    const receitaLiquida = receitaBruta - impostosData.total;

    const custosData = getCategoryBreakdown(DREGroup.OPERATIVE_COST);
    const resultadoBruto = receitaLiquida - custosData.total;

    const adminData = getCategoryBreakdown(DREGroup.ADMIN_EXPENSE);
    const marketingData = getCategoryBreakdown(DREGroup.MARKETING);
    const outrosData = getCategoryBreakdown(DREGroup.OTHER);

    // Unclassified Expenses (Crucial for cost accuracy)
    const unclassifiedExpensesTotal = filteredTransactions
      .filter(t => {
        if (t.type !== TransactionType.EXPENSE) return false;
        const cat = categories.find(c => c.id === t.categoryId);
        return !cat || !cat.dreGroup;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const lucroPrejuizo = resultadoBruto - adminData.total - marketingData.total - outrosData.total - unclassifiedExpensesTotal;

    return {
      receitaBruta,
      revenueData,
      otherIncomeTotal,
      impostos: impostosData,
      receitaLiquida,
      custosOperacionais: custosData,
      resultadoBruto,
      despesasAdmin: adminData,
      despesasMarketing: marketingData,
      outrasDespesas: outrosData,
      unclassifiedExpensesTotal,
      lucroPrejuizo
    };
  }, [filteredTransactions, categories, regime]);

  const periodLabel = dateFilter === 'MONTH' ? `${MONTH_NAMES_FULL[customMonth]} de ${customYear}`
    : dateFilter === 'YEAR' ? `Ano de ${customYear}` : 'Todo o período';

  const exportDRE = () => {
    const rows: (string | number)[][] = [];
    const base = dre.receitaLiquida;
    const line = (label: string, value: number) => rows.push([label, formatNumberBR(value), formatPct(value, base)]);
    const group = (label: string, data: any, sign: string, extra = 0) => {
      line(`${sign} ${label}`, data.total + extra);
      data.tree.forEach((c: any) => {
        rows.push([`      ${c.name}`, formatNumberBR(c.value), formatPct(c.value, base)]);
        (c.children || []).forEach((ch: any) => rows.push([`            ${ch.name}`, formatNumberBR(ch.value), formatPct(ch.value, base)]));
      });
    };
    rows.push([`Período: ${periodLabel}`, `Regime: ${regime === 'CAIXA' ? 'Caixa' : 'Competência'}`]);
    group('Receita Bruta', dre.revenueData, '(+)', dre.otherIncomeTotal);
    if (dre.otherIncomeTotal > 0) rows.push(['      Receitas não classificadas', formatNumberBR(dre.otherIncomeTotal), formatPct(dre.otherIncomeTotal, base)]);
    group('Impostos e Deduções', dre.impostos, '(-)');
    line('(=) Receita Líquida', dre.receitaLiquida);
    group('Custos Operacionais', dre.custosOperacionais, '(-)');
    line('(=) Margem Bruta', dre.resultadoBruto);
    group('Despesas Administrativas', dre.despesasAdmin, '(-)');
    group('Despesas com Marketing', dre.despesasMarketing, '(-)');
    group('Outras Despesas', dre.outrasDespesas, '(-)');
    if (dre.unclassifiedExpensesTotal > 0) line('(-) Despesas Não Classificadas', dre.unclassifiedExpensesTotal);
    line('(=) Lucro / Prejuízo Líquido', dre.lucroPrejuizo);
    const suffix = dateFilter === 'MONTH' ? `${customYear}_${String(customMonth + 1).padStart(2, '0')}` : dateFilter === 'YEAR' ? `${customYear}` : 'completo';
    downloadCSV(['Linha', 'Valor (R$)', '% da Receita Líquida'], rows, `DRE_AwgFinanceiro_${suffix}.csv`);
  };

  // Evolução do saldo REALIZADO (soma de todas as contas). Transferências entre contas não alteram o total.
  const evolutionData = useMemo(() => {
    const net = (t: Transaction) => t.type === TransactionType.INCOME ? t.amount : t.type === TransactionType.EXPENSE ? -t.amount : 0;
    const paid = transactions.filter(t => isPaid(t) && t.type !== TransactionType.TRANSFER);
    const initial = accounts.reduce((sum: number, acc: any) => sum + (Number(acc.initialBalance) || 0), 0);

    // Define os "baldes" (dias do mês, meses do ano ou meses de todo o histórico)
    type Bucket = { name: string; start: string; end: string };
    const buckets: Bucket[] = [];
    if (dateFilter === 'MONTH') {
      const days = new Date(customYear, customMonth + 1, 0).getDate();
      for (let d = 1; d <= days; d++) {
        const iso = toISODate(new Date(customYear, customMonth, d));
        buckets.push({ name: String(d), start: iso, end: iso });
      }
    } else if (dateFilter === 'YEAR') {
      for (let m = 0; m < 12; m++) {
        buckets.push({ name: MONTH_NAMES[m], start: toISODate(new Date(customYear, m, 1)), end: toISODate(new Date(customYear, m + 1, 0)) });
      }
    } else {
      const dates = paid.map(cashDateOf).sort();
      const first = dates.length ? parseDate(dates[0]) : new Date();
      const last = dates.length ? parseDate(dates[dates.length - 1]) : new Date();
      let y = first.getFullYear(), m = first.getMonth();
      while ((y < last.getFullYear() || (y === last.getFullYear() && m <= last.getMonth())) && buckets.length < 240) {
        buckets.push({ name: `${MONTH_NAMES[m]}/${String(y).slice(2)}`, start: toISODate(new Date(y, m, 1)), end: toISODate(new Date(y, m + 1, 0)) });
        m++; if (m > 11) { m = 0; y++; }
      }
    }
    if (buckets.length === 0) return [];

    let running = initial + paid.filter(t => cashDateOf(t) < buckets[0].start).reduce((s, t) => s + net(t), 0);
    return buckets.map(b => {
      running += paid.filter(t => { const d = cashDateOf(t); return d >= b.start && d <= b.end; }).reduce((s, t) => s + net(t), 0);
      return { name: b.name, balance: Math.round(running * 100) / 100 };
    });
  }, [transactions, accounts, dateFilter, customMonth, customYear]);

  const insights = useMemo(() => {
    const list: { type: 'success' | 'warning' | 'danger'; text: string }[] = [];
    const margem = dre.receitaBruta > 0 ? (dre.lucroPrejuizo / dre.receitaBruta) * 100 : 0;

    if (margem > 30) list.push({ type: 'success', text: `Excelente margem de lucro de ${margem.toFixed(1)}%.` });
    else if (margem < 10 && margem > 0) list.push({ type: 'warning', text: `Margem baixa (${margem.toFixed(1)}%).` });
    else if (dre.lucroPrejuizo < 0) list.push({ type: 'danger', text: `Atenção: Prejuízo de ${formatCurrency(Math.abs(dre.lucroPrejuizo), settings.currency)}.` });

    return list;
  }, [dre, settings]);

  return (
    <div className="space-y-8 print:p-0 print:space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Inteligência Financeira</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Análise de desempenho e saúde financeira.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={exportDRE}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-semibold text-sm"
            >
              <FileSpreadsheet size={18} className="text-emerald-500" /> Exportar DRE
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-all shadow-lg font-bold text-sm"
            >
              <Printer size={18} /> Imprimir PDF
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setDateFilter('MONTH')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${dateFilter === 'MONTH' ? 'bg-white dark:bg-slate-700 shadow-sm text-moura-orange-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Mês
            </button>
            <button
              onClick={() => setDateFilter('YEAR')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${dateFilter === 'YEAR' ? 'bg-white dark:bg-slate-700 shadow-sm text-moura-orange-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Ano
            </button>
            <button
              onClick={() => setDateFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${dateFilter === 'ALL' ? 'bg-white dark:bg-slate-700 shadow-sm text-moura-orange-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Tudo
            </button>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setRegime('CAIXA')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${regime === 'CAIXA' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Caixa
            </button>
            <button
              onClick={() => setRegime('COMPETENCIA')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${regime === 'COMPETENCIA' ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Competência
            </button>
          </div>

          {dateFilter !== 'ALL' && (
            <div className="flex items-center gap-2">
              {dateFilter === 'MONTH' && (
                <select value={customMonth} onChange={e => setCustomMonth(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none">
                  {MONTH_NAMES_FULL.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              )}
              <select value={customYear} onChange={e => setCustomYear(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none">
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          <div className="ml-auto text-xs text-slate-400 font-medium flex items-center gap-2">
            <Info size={14} />
            {regime === 'CAIXA' ? 'Caixa: valores pagos/recebidos, pela data do pagamento.' : 'Competência: todos os lançamentos (pagos e em aberto), pela data de competência.'}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Activity size={18} className="text-moura-orange-500" />
            Evolução do Saldo Realizado (todas as contas)
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData}>
                <defs>
                  <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tickFormatter={(value) => `R$ ${new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip formatter={(value: number) => [formatCurrency(value, settings.currency), 'Saldo']} />
                <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorBal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Lightbulb size={18} className="text-amber-500" /> Diagnóstico</h3>
          <div className="space-y-3">
            {insights.length > 0 ? insights.map((insight, i) => (
              <div key={i} className={`p-3 rounded-xl text-xs border-l-4 ${insight.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500 text-emerald-800 dark:text-emerald-300' :
                insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-500 text-amber-800 dark:text-amber-300' :
                  'bg-rose-50 dark:bg-rose-900/10 border-rose-500 text-rose-800 dark:text-rose-300'
                }`}>
                {insight.text}
              </div>
            )) : (
              <div className="text-center py-8 text-slate-400 text-sm italic">
                Sem insights suficientes para o período.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DRE Detail */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><FileText size={18} /> DRE Detalhado</h3>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
            {periodLabel} · {regime === 'CAIXA' ? 'Caixa' : 'Competência'}
          </span>
        </div>
        <div className="p-6">
          <div className="space-y-1">
            <DREGroupSection
              label="(+) Receita Bruta"
              data={dre.revenueData}
              currency={settings.currency} base={dre.receitaLiquida}
              isMain
              initialOpen
              otherValue={dre.otherIncomeTotal}
              otherLabel="Receitas não classificadas"
            />

            <DREGroupSection label="(-) Impostos e Deduções" data={dre.impostos} currency={settings.currency} base={dre.receitaLiquida} isNegative initialOpen />
            <DRERow label="(=) RECEITA LÍQUIDA" value={dre.receitaLiquida} currency={settings.currency} base={dre.receitaLiquida} isSubtotal />

            <DREGroupSection label="(-) Custos Operacionais" data={dre.custosOperacionais} currency={settings.currency} base={dre.receitaLiquida} isNegative initialOpen />
            <DRERow label="(=) MARGEM BRUTA" value={dre.resultadoBruto} currency={settings.currency} base={dre.receitaLiquida} isSubtotal />

            <DREGroupSection label="(-) Despesas Administrativas" data={dre.despesasAdmin} currency={settings.currency} base={dre.receitaLiquida} isNegative />
            <DREGroupSection label="(-) Despesas com Marketing" data={dre.despesasMarketing} currency={settings.currency} base={dre.receitaLiquida} isNegative />
            <DREGroupSection label="(-) Outras Despesas" data={dre.outrasDespesas} currency={settings.currency} base={dre.receitaLiquida} isNegative />

            {dre.unclassifiedExpensesTotal > 0 && (
              <DRERow label="(-) Despesas Não Classificadas" value={dre.unclassifiedExpensesTotal} currency={settings.currency} base={dre.receitaLiquida} isNegative indent={0} />
            )}

            <div className="mt-8 pt-6 border-t-2 border-slate-900 dark:border-slate-100 flex justify-between items-end">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Resultado Final</span>
                <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase">LUCRO / PREJUÍZO LÍQUIDO</h4>
              </div>
              <div className="text-right">
                <span className={`text-3xl font-black ${dre.lucroPrejuizo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatCurrency(dre.lucroPrejuizo, settings.currency)}
                </span>
                <div className="text-xs font-bold text-slate-400 mt-1">
                  {formatPct(dre.lucroPrejuizo, dre.receitaLiquida)} da receita líquida
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Percentual sobre a receita líquida, no formato brasileiro ("28,4%"). Sem receita líquida positiva → "—". */
export const formatPct = (value: number, base: number): string => {
  if (!base || base <= 0 || !Number.isFinite(value)) return '—';
  return `${((value / base) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};

const Pct = ({ value, base, strong }: { value: number; base?: number; strong?: boolean }) =>
  base === undefined ? null : (
    <span className={`inline-block w-16 text-right text-xs tabular-nums ${strong ? 'font-bold text-slate-600 dark:text-slate-300' : 'font-medium text-slate-400 dark:text-slate-500'}`}>
      {formatPct(value, base)}
    </span>
  );

const DRERow = ({ label, value, isMain, isNegative, isSubtotal, currency, indent = 0, base }: any) => {
  return (
    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${isSubtotal ? 'bg-slate-50 dark:bg-slate-800/30 font-bold border-y border-slate-100 dark:border-slate-800 my-2' : ''}`} style={{ paddingLeft: `${indent * 20 + 12}px` }}>
      <span className={`text-sm ${isMain ? 'font-bold dark:text-slate-100' : isSubtotal ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>{label}</span>
      <span className={`text-sm font-semibold ${isNegative ? 'text-rose-500 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'} ${isSubtotal ? 'text-moura-orange-600 dark:text-moura-orange-400' : ''}`}>
        {isNegative && value > 0 ? `- ` : ''}{formatCurrency(value, currency)}
        <Pct value={value} base={base} strong={isSubtotal} />
      </span>
    </div>
  );
};

const DREGroupSection = ({ label, data, currency, isNegative, isMain, initialOpen, otherValue, otherLabel, base }: any) => {
  const [isOpen, setIsOpen] = useState(initialOpen || false);
  const displayTotal = data.total + (otherValue || 0);
  const hasItems = (data.tree && data.tree.length > 0) || (otherValue > 0);

  return (
    <div>
      <div
        className={`flex justify-between items-center py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${isMain ? 'font-bold' : ''}`}
        onClick={() => hasItems && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {hasItems && (
            <div className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          )}
          <span className={`text-sm ${isMain ? 'text-slate-900 dark:text-slate-100' : hasItems ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-500'}`}>{label}</span>
        </div>
        <span className={`text-sm font-semibold ${isNegative ? 'text-rose-500 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'} ${isMain ? 'text-lg' : ''}`}>
          {isNegative && displayTotal > 0 ? `- ` : ''}{formatCurrency(displayTotal, currency)}
          <Pct value={displayTotal} base={base} strong />
        </span>
      </div>

      {isOpen && hasItems && (
        <div className="animate-in slide-in-from-top-1 duration-200">
          {data.tree.map((cat: any) => (
            <div key={cat.id}>
              <DRERow label={cat.name} value={cat.value} currency={currency} isNegative={isNegative} indent={1} base={base} />
              {cat.children && cat.children.map((child: any) => (
                <DRERow key={child.id} label={child.name} value={child.value} currency={currency} isNegative={isNegative} indent={2} base={base} />
              ))}
            </div>
          ))}
          {otherValue > 0 && (
            <DRERow label={otherLabel || 'Outros'} value={otherValue} currency={currency} isNegative={isNegative} indent={1} base={base} />
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
