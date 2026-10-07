import React, { useState, useMemo, useEffect } from 'react';
import { formatCurrency } from '../lib/utils';
import { formatDate, parseDate, startOfToday } from '../lib/dates';
import { cashDateOf, dueDateOf, isOverdue, isPaid } from '../lib/finance';
import { Search, Filter, Trash2, Edit2, CheckCircle, X, AlertTriangle, Repeat } from 'lucide-react';
import { Transaction, Category, Account, TransactionType, Entity } from '../types';
import Pagination from './Pagination';

export interface BillsListProps {
  mode: 'PAYABLE' | 'RECEIVABLE';
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

const ITEMS_PER_PAGE = 15;

/** Tela única usada por Contas a Pagar e Contas a Receber. */
const BillsList: React.FC<BillsListProps> = ({ mode, transactions, categories, accounts, entities, onDelete, onMarkPaid, onEdit, settings }) => {
  const isPayable = mode === 'PAYABLE';
  const txType = isPayable ? TransactionType.EXPENSE : TransactionType.INCOME;
  const t = {
    paidTab: isPayable ? 'Pagos' : 'Recebidos',
    paidBadge: isPayable ? 'Pago' : 'Recebido',
    totalOpen: isPayable ? 'Total a Pagar (Filtro)' : 'Total a Receber (Filtro)',
    search: isPayable ? 'Pesquisar contas a pagar...' : 'Pesquisar recebimentos...',
    entityLabel: isPayable ? 'Fornecedor / Colaborador' : 'Cliente',
    entityAll: isPayable ? 'Todos (fornecedores e colaboradores)' : 'Todos os Clientes',
    payAction: isPayable ? 'Dar baixa (pago hoje)' : 'Confirmar recebimento (hoje)',
    empty: isPayable ? 'Nenhuma conta encontrada' : 'Nenhum recebimento encontrado',
    lateColor: isPayable ? 'rose' : 'amber',
  };

  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'PAID'>('PENDING');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const today = startOfToday();

  const filtered = useMemo(() => {
    const start = startDate ? parseDate(startDate) : null;
    const end = endDate ? parseDate(endDate) : null;
    const q = filter.trim().toLowerCase();

    return transactions
      .filter(tx => {
        if (tx.type !== txType) return false;
        if (q && !tx.description.toLowerCase().includes(q)) return false;

        const overdue = isOverdue(tx, today);
        if (statusFilter === 'PAID' && !isPaid(tx)) return false;
        if (statusFilter === 'PENDING' && isPaid(tx)) return false;
        if (statusFilter === 'OVERDUE' && !overdue) return false;

        const due = parseDate(dueDateOf(tx));
        if (start && due < start) return false;
        if (end && due > end) return false;

        if (selectedCategory !== 'ALL' && tx.categoryId !== selectedCategory) return false;
        if (selectedEntity !== 'ALL' && tx.entityId !== selectedEntity) return false;
        return true;
      })
      .sort((a, b) => {
        if (statusFilter === 'PAID') return cashDateOf(b).localeCompare(cashDateOf(a));
        // Em aberto primeiro, por vencimento mais próximo
        if (isPaid(a) !== isPaid(b)) return isPaid(a) ? 1 : -1;
        return dueDateOf(a).localeCompare(dueDateOf(b));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, txType, filter, statusFilter, startDate, endDate, selectedCategory, selectedEntity]);

  useEffect(() => { setCurrentPage(1); }, [filter, statusFilter, startDate, endDate, selectedCategory, selectedEntity]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const summary = useMemo(() => {
    const total = filtered.reduce((acc, tx) => acc + tx.amount, 0);
    const overdue = filtered.filter(tx => isOverdue(tx, today)).reduce((acc, tx) => acc + tx.amount, 0);
    const pending = filtered.filter(tx => !isPaid(tx)).reduce((acc, tx) => acc + tx.amount, 0);
    return { total, overdue, pending };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const clearFilters = () => {
    setFilter(''); setStatusFilter('ALL'); setStartDate(''); setEndDate('');
    setSelectedCategory('ALL'); setSelectedEntity('ALL');
  };

  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const hasAdvancedFilter = !!(startDate || endDate || selectedCategory !== 'ALL' || selectedEntity !== 'ALL');
  const late = t.lateColor === 'rose'
    ? { text: 'text-rose-600 dark:text-rose-400', small: 'text-rose-500', row: 'bg-rose-50/30 dark:bg-rose-900/10', badge: 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/30', glow: 'bg-rose-500' }
    : { text: 'text-amber-600 dark:text-amber-400', small: 'text-amber-500', row: 'bg-amber-50/30 dark:bg-amber-900/10', badge: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30', glow: 'bg-amber-500' };

  const tabs: { id: typeof statusFilter; label: string; active: string }[] = [
    { id: 'PENDING', label: 'Em aberto', active: 'bg-amber-500 text-white shadow-sm' },
    { id: 'OVERDUE', label: 'Atrasados', active: 'bg-rose-500 text-white shadow-sm' },
    { id: 'PAID', label: t.paidTab, active: 'bg-emerald-500 text-white shadow-sm' },
    { id: 'ALL', label: 'Todos', active: 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' },
  ];

  const inputCls = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 transition-all dark:text-slate-100';

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-fit gap-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setStatusFilter(tab.id)}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 text-sm font-bold rounded-lg transition-all ${statusFilter === tab.id ? tab.active : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.totalOpen}</span>
          <div className="text-2xl mt-1 font-black text-slate-800 dark:text-slate-100 tracking-tight">{formatCurrency(summary.pending, settings.currency)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          {summary.overdue > 0 && <div className={`absolute top-0 right-0 w-16 h-16 ${late.glow} blur-2xl opacity-20 -mr-8 -mt-8`}></div>}
          <div className="flex justify-between items-start">
            <span className={`text-xs font-bold uppercase tracking-wider ${late.small}`}>Em Atraso</span>
            <AlertTriangle size={18} className={late.small} />
          </div>
          <div className={`text-2xl mt-1 font-black tracking-tight ${late.text}`}>{formatCurrency(summary.overdue, settings.currency)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Geral (Filtro)</span>
          <div className="text-2xl mt-1 font-black text-slate-700 dark:text-slate-200 tracking-tight">{formatCurrency(summary.total, settings.currency)}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder={t.search} value={filter} onChange={e => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 dark:text-slate-100 transition-all font-medium text-sm" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-bold ${showFilters || hasAdvancedFilter
              ? 'bg-moura-orange-50 border border-moura-orange-200 text-moura-orange-700 dark:bg-moura-orange-900/20 dark:border-moura-orange-800 dark:text-moura-orange-400'
              : 'bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            <Filter size={18} /> Filtros
            {hasAdvancedFilter && <span className="flex items-center justify-center w-5 h-5 bg-moura-orange-600 text-white rounded-full text-[10px] ml-1">!</span>}
          </button>
        </div>

        {showFilters && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Vencimento (Início)</label>
              <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Vencimento (Fim)</label>
              <input type="date" className={inputCls} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Categoria</label>
              <select className={inputCls} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                <option value="ALL">Todas as Categorias</option>
                {categories.filter(c => c.type === txType || c.type === 'BOTH').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.entityLabel}</label>
              <select className={inputCls} value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)}>
                <option value="ALL">{t.entityAll}</option>
                {entities.filter(e => e.type === 'BOTH' || (isPayable ? (e.type === 'SUPPLIER' || e.type === 'EMPLOYEE') : e.type === 'CLIENT')).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
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

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginated.map(tx => {
                const cat = categories.find(c => c.id === tx.categoryId);
                const acc = accounts.find(a => a.id === tx.accountId);
                const ent = entities.find(e => e.id === tx.entityId);
                const overdue = isOverdue(tx, today);
                const paid = isPaid(tx);
                return (
                  <tr key={tx.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group ${overdue ? late.row : ''}`}>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <div className={`font-bold ${overdue ? late.text : 'text-slate-800 dark:text-slate-200'}`}>{formatDate(dueDateOf(tx))}</div>
                      {paid && tx.paymentDate && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">{t.paidBadge} em {formatDate(tx.paymentDate)}</span>
                      )}
                      {overdue && <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 block ${late.small}`}>Atrasado</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        {tx.description}
                        {tx.isRecurring && <span title="Lançamento recorrente"><Repeat size={12} className="text-moura-orange-500" /></span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {acc && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 font-bold uppercase">{acc.name}</span>}
                        {ent && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{ent.name}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm"
                        style={{ backgroundColor: `${cat?.color || '#94a3b8'}15`, color: cat?.color || '#64748b', border: `1px solid ${cat?.color || '#94a3b8'}30` }}>
                        {cat?.name || 'Sem categoria'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-black text-right whitespace-nowrap ${isPayable ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatCurrency(tx.amount, settings.currency)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${paid
                        ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30'
                        : overdue ? late.badge
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
                        {paid ? t.paidBadge : overdue ? 'Atrasado' : 'Em aberto'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {!paid && (
                          <button onClick={() => onMarkPaid(tx.id)} title={t.payAction}
                            className="p-2 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition-all hover:scale-110">
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button onClick={() => onEdit(tx)} title="Editar" className="p-2 text-moura-orange-600 hover:bg-moura-orange-100 dark:hover:bg-moura-orange-900/40 rounded-xl transition-all hover:scale-110">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => onDelete(tx.id)} title="Excluir" className="p-2 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-all hover:scale-110">
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
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">{t.empty}</h3>
              <p className="text-sm">Tente ajustar os filtros ou os termos da pesquisa.</p>
              {(filter || statusFilter !== 'ALL' || hasAdvancedFilter) && (
                <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-moura-orange-600 dark:text-moura-orange-400 shadow-sm hover:shadow transition-all">
                  Ver todos
                </button>
              )}
            </div>
          )}
        </div>
        <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={ITEMS_PER_PAGE} onChange={setCurrentPage} />
      </div>
    </div>
  );
};

export default BillsList;
