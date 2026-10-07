import React, { useState, useMemo, useEffect } from 'react';
import { formatCurrency, downloadCSV, formatNumberBR, TYPE_LABELS, STATUS_LABELS, PAYMENT_METHOD_LABELS } from '../lib/utils';
import { formatDate, parseDate, startOfToday, todayISO } from '../lib/dates';
import { isOverdue, isPaid } from '../lib/finance';
import { Search, Filter, Trash2, Edit2, CheckCircle, FileSpreadsheet, X, Repeat } from 'lucide-react';
import Pagination from './Pagination';
import { Transaction, Category, Account, TransactionType, TransactionStatus, Entity } from '../types';

interface TransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  entities: Entity[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  onMarkPaid: (id: string) => void;
  onEdit: (t: Transaction) => void;
  settings: any;
}

const Transactions: React.FC<TransactionsProps> = ({ transactions, categories, accounts, entities, onDelete, onMarkPaid, onEdit, settings }) => {
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');

  // Advanced Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedAccount, setSelectedAccount] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filtered = useMemo(() => {
    return transactions
      .filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(filter.toLowerCase());
        const matchesType = typeFilter === 'ALL' || t.type === typeFilter;

        let matchesDate = true;
        if (startDate) matchesDate = matchesDate && parseDate(t.accrualDate) >= parseDate(startDate);
        if (endDate) matchesDate = matchesDate && parseDate(t.accrualDate) <= parseDate(endDate);

        const matchesCategory = selectedCategory === 'ALL' || t.categoryId === selectedCategory;
        const matchesAccount = selectedAccount === 'ALL' || t.accountId === selectedAccount || t.destinationAccountId === selectedAccount;
        const matchesEntity = selectedEntity === 'ALL' || t.entityId === selectedEntity;

        return matchesSearch && matchesType && matchesDate && matchesCategory && matchesAccount && matchesEntity;
      })
      // Mais recentes primeiro (pela data de competência; empate → ordem de cadastro)
      .sort((a, b) => b.accrualDate.localeCompare(a.accrualDate) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [transactions, filter, typeFilter, startDate, endDate, selectedCategory, selectedAccount, selectedEntity]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, typeFilter, startDate, endDate, selectedCategory, selectedAccount, selectedEntity]);

  const summary = useMemo(() => {
    const income = filtered
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, t) => acc + t.amount, 0);

    const expense = filtered
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => acc + t.amount, 0);

    return { income, expense, balance: income - expense };
  }, [filtered]);

  const exportTransactionsCSV = () => {
    const headers = ['Competência', 'Vencimento', 'Pagamento', 'Descrição', 'Valor', 'Tipo', 'Categoria', 'Conta', 'Conta Destino', 'Contato', 'Forma Pgto', 'Centro de Custo', 'Status'];
    const rows = filtered.map(t => [
      formatDate(t.accrualDate),
      formatDate(t.dueDate),
      t.paymentDate ? formatDate(t.paymentDate) : '',
      t.description,
      formatNumberBR(t.amount),
      TYPE_LABELS[t.type] || t.type,
      categories.find(c => c.id === t.categoryId)?.name || '',
      accounts.find(a => a.id === t.accountId)?.name || '',
      accounts.find(a => a.id === t.destinationAccountId)?.name || '',
      entities.find(e => e.id === t.entityId)?.name || '',
      PAYMENT_METHOD_LABELS[t.paymentMethod] || t.paymentMethod,
      t.costCenter || '',
      STATUS_LABELS[t.status] || t.status,
    ]);
    downloadCSV(headers, rows, `lancamentos_awgfinanceiro_${todayISO()}.csv`);
  };

  const clearFilters = () => {
    setFilter('');
    setTypeFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSelectedCategory('ALL');
    setSelectedAccount('ALL');
    setSelectedEntity('ALL');
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);
  const today = startOfToday();
  const paginatedTransactions = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 pb-10">

      {/* Tipo Filter Tabs */}
      <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-fit mx-auto sm:mx-0">
        <button onClick={() => setTypeFilter('ALL')} className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${typeFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Todos</button>
        <button onClick={() => setTypeFilter(TransactionType.INCOME)} className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${typeFilter === TransactionType.INCOME ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Receitas</button>
        <button onClick={() => setTypeFilter(TransactionType.EXPENSE)} className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${typeFilter === TransactionType.EXPENSE ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Despesas</button>
        <button onClick={() => setTypeFilter(TransactionType.TRANSFER)} className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${typeFilter === TransactionType.TRANSFER ? 'bg-moura-orange-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Transf.</button>
      </div>

      {/* Summary Card based on Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entradas (Filtro)</span>
          <div className="text-2xl mt-1 font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{formatCurrency(summary.income, settings.currency)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saídas (Filtro)</span>
          <div className="text-2xl mt-1 font-black text-rose-600 dark:text-rose-400 tracking-tight">{formatCurrency(summary.expense, settings.currency)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo do Período</span>
          <div className={`text-2xl mt-1 font-black tracking-tight ${summary.balance >= 0 ? 'text-moura-orange-600 dark:text-moura-orange-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatCurrency(summary.balance, settings.currency)}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar por descrição..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 dark:text-slate-100 transition-all font-medium text-sm"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-bold
                ${showFilters || startDate || endDate || selectedCategory !== 'ALL' || selectedAccount !== 'ALL' || selectedEntity !== 'ALL'
                  ? 'bg-moura-orange-50 border border-moura-orange-200 text-moura-orange-700 dark:bg-moura-orange-900/20 dark:border-moura-orange-800 dark:text-moura-orange-400'
                  : 'bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
            >
              <Filter size={18} />
              Filtros
              {(startDate || endDate || selectedCategory !== 'ALL' || selectedAccount !== 'ALL' || selectedEntity !== 'ALL') && (
                <span className="flex items-center justify-center w-5 h-5 bg-moura-orange-600 text-white rounded-full text-[10px] ml-1">!</span>
              )}
            </button>
            <button
              onClick={exportTransactionsCSV}
              className="flex items-center gap-2 px-4 py-2.5 border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all text-sm font-bold shadow-sm"
            >
              <FileSpreadsheet size={18} />
              Exportar
            </button>
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Período</label>
              <div className="flex gap-2">
                <input type="date" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 transition-all"
                  value={startDate} onChange={e => setStartDate(e.target.value)} />
                <input type="date" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 transition-all"
                  value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Categoria</label>
              <select className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 transition-all"
                value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                <option value="ALL">Todas as Categorias</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Conta / Banco</label>
              <select className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 transition-all"
                value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
                <option value="ALL">Todas as Contas</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Contato (Cliente/Forn.)</label>
              <select className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 transition-all"
                value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)}>
                <option value="ALL">Todos os Contatos</option>
                {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div className="lg:col-span-4 flex justify-end pt-2">
              <button onClick={clearFilters} className="text-sm px-4 py-2 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 font-bold flex items-center gap-2 transition-all">
                <X size={16} /> Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedTransactions.map((t) => {
                const cat = categories.find(c => c.id === t.categoryId);
                const acc = accounts.find(a => a.id === t.accountId);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(t.accrualDate)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        {t.description}
                        {t.isRecurring && <span title="Lançamento recorrente"><Repeat size={12} className="text-moura-orange-500" /></span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 font-bold uppercase">
                          {acc?.name || 'Conta removida'}{t.type === TransactionType.TRANSFER && ` → ${accounts.find(a => a.id === t.destinationAccountId)?.name || '?'}`}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{PAYMENT_METHOD_LABELS[t.paymentMethod] || t.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm"
                        style={{ backgroundColor: `${cat?.color || '#94a3b8'}15`, color: cat?.color || '#64748b', border: `1px solid ${cat?.color || '#94a3b8'}30` }}
                      >
                        {t.type === TransactionType.TRANSFER ? 'Transferência' : cat?.name || 'Sem categoria'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-black text-right whitespace-nowrap ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : t.type === TransactionType.EXPENSE ? 'text-rose-600 dark:text-rose-400' : 'text-moura-orange-600 dark:text-moura-orange-400'}`}>
                      {t.type === TransactionType.INCOME ? '+' : t.type === TransactionType.EXPENSE ? '-' : ''} {formatCurrency(t.amount, settings.currency)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap border ${isPaid(t)
                          ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30'
                          : isOverdue(t, today)
                            ? 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/30'
                            : 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/30'}`}>
                        {isPaid(t) ? 'Pago' : isOverdue(t, today) ? 'Atrasado' : 'Em aberto'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {t.status !== TransactionStatus.PAID && (
                          <button
                            onClick={() => onMarkPaid(t.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition-all hover:scale-110"
                            title="Marcar como pago (hoje)"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(t)}
                          className="p-2 text-moura-orange-600 hover:bg-moura-orange-100 dark:hover:bg-moura-orange-900/40 rounded-xl transition-all hover:scale-110"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => onDelete(t.id)}
                          className="p-2 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-all hover:scale-110"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filtered.length === 0 && (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30 dark:bg-slate-800/10">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Search size={24} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">Nenhum lançamento encontrado</h3>
              <p className="text-sm">Tente ajustar os filtros ou os termos da pesquisa.</p>
              {(filter || typeFilter !== 'ALL' || startDate || endDate || selectedCategory !== 'ALL' || selectedAccount !== 'ALL' || selectedEntity !== 'ALL') && (
                <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-moura-orange-600 dark:text-moura-orange-400 shadow-sm hover:shadow transition-all">
                  Limpar todos os filtros
                </button>
              )}
            </div>
          )}
        </div>

        <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onChange={setCurrentPage} />
      </div>
    </div>
  );
};

export default Transactions;
