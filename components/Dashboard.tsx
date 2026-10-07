import React, { useMemo, useState } from 'react';
import { formatCurrency } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, Wallet, AlertTriangle, TrendingUp, AlertCircle, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { Transaction, Category, Account, TransactionType, DREGroup } from '../types';
import { formatDate, isSameMonth, MONTH_NAMES, parseDate, startOfToday } from '../lib/dates';
import { cashDateOf, dueDateOf, isOverdue, isPaid } from '../lib/finance';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  settings: any;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, categories, accounts, settings }) => {
  const [dateFilter, setDateFilter] = useState<'ALL' | 'MONTH' | 'YEAR'>('MONTH');

  const today = useMemo(() => startOfToday(), []);
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const next7Days = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 7); return d; }, [today]);

  /** A data pertence ao período selecionado? */
  const inPeriod = (iso: string) => {
    if (dateFilter === 'ALL') return true;
    const d = parseDate(iso);
    if (dateFilter === 'YEAR') return d.getFullYear() === currentYear;
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  // Realizado (regime de caixa): lançamentos pagos cuja data de pagamento cai no período
  const paidInPeriod = useMemo(
    () => transactions.filter(t => isPaid(t) && inPeriod(cashDateOf(t))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, dateFilter]
  );
  // Em aberto com vencimento no período
  const openInPeriod = useMemo(
    () => transactions.filter(t => !isPaid(t) && inPeriod(dueDateOf(t))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, dateFilter]
  );

  const stats = useMemo(() => {
    const sum = (list: Transaction[]) => list.reduce((acc, t) => acc + t.amount, 0);
    // Movimentações fora da DRE (sócios, empréstimos, aplicações) não entram no resultado
    const inDRE = (t: Transaction) => categories.find(c => c.id === t.categoryId)?.dreGroup !== DREGroup.EXCLUDED;
    const received = sum(paidInPeriod.filter(t => t.type === TransactionType.INCOME && inDRE(t)));
    const paid = sum(paidInPeriod.filter(t => t.type === TransactionType.EXPENSE && inDRE(t)));
    const pendingReceivable = sum(openInPeriod.filter(t => t.type === TransactionType.INCOME));
    const pendingPayable = sum(openInPeriod.filter(t => t.type === TransactionType.EXPENSE));
    const totalBalance = accounts.reduce((acc, a) => acc + (a.balance ?? a.initialBalance), 0);
    const overduePayable = sum(transactions.filter(t => t.type === TransactionType.EXPENSE && isOverdue(t, today)));

    // DRE simplificado (realizado): custos variáveis = impostos + custos operacionais; o resto é custo fixo
    const variableCosts = sum(paidInPeriod.filter(t => {
      if (t.type !== TransactionType.EXPENSE) return false;
      const cat = categories.find(c => c.id === t.categoryId);
      return cat?.dreGroup === DREGroup.TAXES || cat?.dreGroup === DREGroup.OPERATIVE_COST;
    }));
    const fixedCosts = paid - variableCosts;

    return {
      received, paid, pendingReceivable, pendingPayable, totalBalance, overduePayable,
      expectedResult: (received + pendingReceivable) - (paid + pendingPayable),
      realizedResult: received - paid,
      contributionMargin: received - variableCosts,
      variableCosts,
      fixedCosts,
    };
  }, [paidInPeriod, openInPeriod, transactions, accounts, categories, today]);

  const upcomingBills = useMemo(() => transactions
    .filter(t => t.type === TransactionType.EXPENSE && !isPaid(t))
    .filter(t => { const due = parseDate(dueDateOf(t)); return due >= today && due <= next7Days; })
    .sort((a, b) => dueDateOf(a).localeCompare(dueDateOf(b)))
    .slice(0, 5), [transactions, today, next7Days]);

  const overdueBills = useMemo(() => transactions
    .filter(t => t.type === TransactionType.EXPENSE && isOverdue(t, today))
    .sort((a, b) => dueDateOf(a).localeCompare(dueDateOf(b)))
    .slice(0, 3), [transactions, today]);

  // Evolução mensal do ano atual (realizado, pela data do pagamento)
  const monthlyData = useMemo(() => MONTH_NAMES.map((name, i) => {
    const inMonth = (t: Transaction) => isPaid(t) && isSameMonth(cashDateOf(t), i, currentYear);
    return {
      name,
      Receitas: transactions.filter(t => t.type === TransactionType.INCOME && inMonth(t)).reduce((a, t) => a + t.amount, 0),
      Despesas: transactions.filter(t => t.type === TransactionType.EXPENSE && inMonth(t)).reduce((a, t) => a + t.amount, 0),
    };
  }), [transactions, currentYear]);

  const accountData = useMemo(() => {
    return accounts.map(a => ({
      name: a.name,
      Saldo: a.balance ?? a.initialBalance,
      color: a.type === 'BANK' ? '#3b82f6' : a.type === 'CREDIT_CARD' ? '#f43f5e' : '#10b981'
    }));
  }, [accounts]);

  const expenseCategoryData = useMemo(() => {
    return categories
      .filter(c => (c.type === TransactionType.EXPENSE || c.type === 'BOTH') && c.dreGroup !== DREGroup.EXCLUDED)
      .map(cat => {
        const value = paidInPeriod
          .filter(t => t.categoryId === cat.id && t.type === TransactionType.EXPENSE)
          .reduce((acc, t) => acc + t.amount, 0);
        return { name: cat.name, value, color: cat.color };
      })
      .filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [paidInPeriod, categories]);

  return (
    <div className="space-y-6 pb-10">
      {/* Filters Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp className="text-moura-orange-500" /> Visão Geral
        </h1>
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button onClick={() => setDateFilter('MONTH')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${dateFilter === 'MONTH' ? 'bg-white dark:bg-slate-700 text-moura-orange-600 dark:text-moura-orange-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Este Mês</button>
          <button onClick={() => setDateFilter('YEAR')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${dateFilter === 'YEAR' ? 'bg-white dark:bg-slate-700 text-moura-orange-600 dark:text-moura-orange-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Este Ano</button>
          <button onClick={() => setDateFilter('ALL')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${dateFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-moura-orange-600 dark:text-moura-orange-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Tudo</button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Saldo Atual" 
          value={formatCurrency(stats.totalBalance, settings.currency)} 
          icon={<Wallet className="text-moura-orange-500" />} 
          subtitle="Em todas as contas"
          trend={stats.realizedResult >= 0 ? 'positive' : 'negative'}
        />
        <StatCard 
          title="A Receber" 
          value={formatCurrency(stats.pendingReceivable, settings.currency)} 
          icon={<ArrowUpCircle className="text-emerald-500" />} 
          subtitle="Em aberto, vencendo no período" 
        />
        <StatCard 
          title="A Pagar" 
          value={formatCurrency(stats.pendingPayable, settings.currency)} 
          icon={<ArrowDownCircle className="text-rose-500" />} 
          subtitle={stats.overduePayable > 0 ? `${formatCurrency(stats.overduePayable, settings.currency)} em atraso` : 'Em aberto, vencendo no período'}
          subtitleColor={stats.overduePayable > 0 ? "text-rose-500 font-bold" : "text-slate-400"}
        />
        <StatCard 
          title="Resultado Previsto" 
          value={formatCurrency(stats.expectedResult, settings.currency)} 
          icon={<TrendingUp className="text-indigo-500" />} 
          subtitle="Realizado + em aberto no período"
          valueColor={stats.expectedResult >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolução do Caixa */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Evolução do Caixa</h3>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">Ano Atual</span>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" strokeOpacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => Math.abs(val) >= 1000 ? `${(val / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : `${val}`} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} />
                <Tooltip formatter={(value: number) => [formatCurrency(value, settings.currency), '']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={3} fill="url(#colorInc)" />
                <Area type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Atenção: Contas Atrasadas e a Vencer */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock className="text-amber-500" size={20} /> Atenção
            </h3>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto custom-scrollbar space-y-4">
            {overdueBills.length === 0 && upcomingBills.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-70 mt-10">
                <CheckCircle2 size={40} className="text-emerald-500 mb-3" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Tudo em dia!</p>
                <p className="text-xs text-slate-500">Nenhuma conta atrasada ou a vencer nos próximos 7 dias.</p>
              </div>
            )}

            {overdueBills.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle size={14} /> Atrasadas
                </h4>
                {overdueBills.map(t => (
                  <div key={t.id} className="flex justify-between items-center p-3 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30">
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                      <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                        Venceu: {formatDate(dueDateOf(t))}
                      </p>
                    </div>
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400 whitespace-nowrap pl-3">
                      {formatCurrency(t.amount, settings.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {upcomingBills.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={14} /> Próximos 7 Dias
                </h4>
                {upcomingBills.map(t => {
                  const cat = categories.find(c => c.id === t.categoryId);
                  return (
                    <div key={t.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat?.color || '#ccc' }}></span>
                          <p className="text-[10px] font-semibold text-slate-500">
                            Vence: {formatDate(dueDateOf(t))}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-slate-700 dark:text-slate-300 whitespace-nowrap pl-3">
                        {formatCurrency(t.amount, settings.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Principais Despesas */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold mb-6 text-slate-800 dark:text-slate-100">Top Despesas</h3>
          {expenseCategoryData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-400">Sem dados no período</div>
          ) : (
            <>
              <div className="h-[200px] mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseCategoryData} innerRadius={65} outerRadius={85} paddingAngle={5} dataKey="value">
                      {expenseCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value, settings.currency), 'Valor']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {expenseCategoryData.map((d, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: d.color }} />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{d.name}</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(d.value, settings.currency)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Saldos por Conta */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold mb-6 text-slate-800 dark:text-slate-100">Saldos por Conta</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={accountData} margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" strokeOpacity={0.5} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value: number) => [formatCurrency(value, settings.currency), 'Saldo']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="Saldo" radius={[0, 6, 6, 0]} barSize={24}>
                  {accountData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DRE Simplificado / Margem */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold mb-6 text-slate-800 dark:text-slate-100">DRE Simplificado</h3>
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-500">Receita Bruta Realizada</span>
              <span className="text-sm font-black text-emerald-600">{formatCurrency(stats.received, settings.currency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-500">(-) Custos Variáveis</span>
              <span className="text-sm font-black text-rose-500">{formatCurrency(stats.variableCosts, settings.currency)}</span>
            </div>
            <div className="py-3 border-y border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">(=) Margem Contribuição</span>
              <span className="text-sm font-black text-indigo-600">{formatCurrency(stats.contributionMargin, settings.currency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-500">(-) Custos Fixos e Outros</span>
              <span className="text-sm font-black text-rose-500">{formatCurrency(stats.fixedCosts, settings.currency)}</span>
            </div>
            
            <div className="mt-4 pt-4 border-t-2 border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
              <span className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">Lucro Líquido</span>
              <span className={`text-xl font-black tracking-tight ${stats.realizedResult >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(stats.realizedResult, settings.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, subtitle, valueColor = "text-slate-900 dark:text-slate-100", subtitleColor = "text-slate-400 dark:text-slate-500", trend }: any) => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-3">
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</span>
      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>
    </div>
    <div className={`text-2xl font-black ${valueColor} tracking-tight`}>{value}</div>
    <div className={`mt-2 text-[11px] font-semibold ${subtitleColor}`}>{subtitle}</div>
  </div>
);

export default Dashboard;
