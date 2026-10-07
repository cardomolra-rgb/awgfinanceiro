import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  ArrowLeftRight,
  Wallet,
  Tags,
  Users,
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  FilePieChart,
  Settings,
  PlusCircle,
  ChevronRight,
  Command
} from 'lucide-react';
import { Transaction, Category, Account, Entity, TransactionType } from '../types';
import { formatCurrency } from '../lib/utils';
import { formatDate } from '../lib/dates';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  entities: Entity[];
  setActiveTab: (tab: string) => void;
  onNewTransaction: (type?: TransactionType) => void;
  onEditTransaction?: (t: Transaction) => void;
  currency?: string;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  transactions = [],
  categories = [],
  accounts = [],
  entities = [],
  setActiveTab,
  onNewTransaction,
  onEditTransaction,
  currency = 'BRL'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navActions = useMemo(() => [
    { id: 'new-expense', label: 'Nova Despesa', type: 'action', icon: ArrowDownCircle, color: 'text-rose-500', action: () => onNewTransaction(TransactionType.EXPENSE) },
    { id: 'new-income', label: 'Nova Receita', type: 'action', icon: ArrowUpCircle, color: 'text-emerald-500', action: () => onNewTransaction(TransactionType.INCOME) },
    { id: 'new-transfer', label: 'Nova Transferência', type: 'action', icon: ArrowLeftRight, color: 'text-moura-orange-500', action: () => onNewTransaction(TransactionType.TRANSFER) },
    { id: 'nav-dashboard', label: 'Ir para Dashboard', type: 'page', icon: LayoutDashboard, color: 'text-blue-500', action: () => setActiveTab('dashboard') },
    { id: 'nav-txs', label: 'Ir para Lançamentos', type: 'page', icon: ArrowLeftRight, color: 'text-purple-500', action: () => setActiveTab('transactions') },
    { id: 'nav-payable', label: 'Ir para Contas a Pagar', type: 'page', icon: ArrowDownCircle, color: 'text-rose-500', action: () => setActiveTab('payable') },
    { id: 'nav-receivable', label: 'Ir para Contas a Receber', type: 'page', icon: ArrowUpCircle, color: 'text-emerald-500', action: () => setActiveTab('receivable') },
    { id: 'nav-accounts', label: 'Ir para Contas & Bancos', type: 'page', icon: Wallet, color: 'text-indigo-500', action: () => setActiveTab('accounts') },
    { id: 'nav-reports', label: 'Ir para Relatórios', type: 'page', icon: FilePieChart, color: 'text-amber-500', action: () => setActiveTab('reports') },
    { id: 'nav-settings', label: 'Ir para Configurações', type: 'page', icon: Settings, color: 'text-slate-500', action: () => setActiveTab('settings') },
  ], [onNewTransaction, setActiveTab]);

  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return {
        actions: navActions.slice(0, 5),
        transactions: [],
        accounts: [],
        categories: [],
        entities: []
      };
    }

    const filteredActions = navActions.filter(a => a.label.toLowerCase().includes(q));

    const filteredTransactions = transactions.filter(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const acc = accounts.find(a => a.id === t.accountId);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchCat = cat?.name.toLowerCase().includes(q);
      const matchAcc = acc?.name.toLowerCase().includes(q);
      const matchVal = t.amount.toString().includes(q);
      return matchDesc || matchCat || matchAcc || matchVal;
    }).slice(0, 6);

    const filteredAccounts = accounts.filter(a => a.name.toLowerCase().includes(q)).slice(0, 4);
    const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(q)).slice(0, 4);
    const filteredEntities = entities.filter(e => e.name.toLowerCase().includes(q)).slice(0, 4);

    return {
      actions: filteredActions,
      transactions: filteredTransactions,
      accounts: filteredAccounts,
      categories: filteredCategories,
      entities: filteredEntities
    };
  }, [searchTerm, navActions, transactions, categories, accounts, entities]);

  if (!isOpen) return null;

  const handleSelect = (callback: () => void) => {
    callback();
    onClose();
  };

  const hasAnyResult = searchResults.actions.length > 0 ||
    searchResults.transactions.length > 0 ||
    searchResults.accounts.length > 0 ||
    searchResults.categories.length > 0 ||
    searchResults.entities.length > 0;

  return (
    <div
      className="fixed inset-0 z-[300] bg-slate-900/70 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/40">
          <Search size={20} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Digite para buscar lançamentos, páginas, bancos, contatos... (Esc para sair)"
            className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium text-base"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-slate-400 bg-slate-200/60 dark:bg-slate-800 rounded-md border border-slate-300/50 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-5 custom-scrollbar text-slate-700 dark:text-slate-200">
          {/* Actions & Navigation */}
          {searchResults.actions.length > 0 && (
            <div>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-2 block">
                Ações e Navegação
              </span>
              <div className="space-y-1">
                {searchResults.actions.map(act => (
                  <button
                    key={act.id}
                    onClick={() => handleSelect(act.action)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800 ${act.color}`}>
                        <act.icon size={18} />
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-moura-orange-600 dark:group-hover:text-moura-orange-400 transition-colors">
                        {act.label}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          {searchResults.transactions.length > 0 && (
            <div>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-2 block">
                Lançamentos Encontrados
              </span>
              <div className="space-y-1">
                {searchResults.transactions.map(t => {
                  const cat = categories.find(c => c.id === t.categoryId);
                  const acc = accounts.find(a => a.id === t.accountId);
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelect(() => {
                        setActiveTab('transactions');
                        if (onEditTransaction) onEditTransaction(t);
                      })}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : t.type === TransactionType.EXPENSE ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' : 'bg-moura-orange-100 text-moura-orange-600 dark:bg-moura-orange-900/30'}`}>
                          <ArrowLeftRight size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-moura-orange-600 dark:group-hover:text-moura-orange-400 transition-colors">{t.description}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{formatDate(t.accrualDate)}</span>
                            <span>•</span>
                            <span className="uppercase font-semibold">{cat?.name || 'Sem Categoria'}</span>
                            <span>•</span>
                            <span>{acc?.name}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-sm font-black ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : t.type === TransactionType.EXPENSE ? 'text-rose-600 dark:text-rose-400' : 'text-moura-orange-600 dark:text-moura-orange-400'}`}>
                        {t.type === TransactionType.INCOME ? '+' : t.type === TransactionType.EXPENSE ? '-' : ''} {formatCurrency(t.amount, currency)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Accounts */}
          {searchResults.accounts.length > 0 && (
            <div>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-2 block">
                Contas e Bancos
              </span>
              <div className="space-y-1">
                {searchResults.accounts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => handleSelect(() => setActiveTab('accounts'))}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30">
                        <Wallet size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">{a.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{formatCurrency(a.balance ?? a.initialBalance, currency)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {searchResults.categories.length > 0 && (
            <div>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-2 block">
                Categorias
              </span>
              <div className="flex flex-wrap gap-2 p-1">
                {searchResults.categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(() => setActiveTab('categories'))}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }}></span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Entities */}
          {searchResults.entities.length > 0 && (
            <div>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-2 block">
                Contatos (Clientes / Fornecedores)
              </span>
              <div className="space-y-1">
                {searchResults.entities.map(e => (
                  <button
                    key={e.id}
                    onClick={() => handleSelect(() => setActiveTab('entities'))}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/30">
                        <Users size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 transition-colors">{e.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase">{e.type === 'CLIENT' ? 'Cliente' : e.type === 'SUPPLIER' ? 'Fornecedor' : e.type === 'EMPLOYEE' ? 'Colaborador' : 'Cliente e Fornecedor'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasAnyResult && (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Search size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Nenhum resultado para "{searchTerm}"</p>
              <p className="text-xs">Tente buscar por termos como "venda", "aluguel", "banco", etc.</p>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400 font-medium">
          Dica: Pressione <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border font-bold text-[10px]">Cmd+K</kbd> ou <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border font-bold text-[10px]">Ctrl+K</kbd> de qualquer tela para buscar rapidamente.
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
