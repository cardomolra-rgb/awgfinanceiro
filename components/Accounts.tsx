import React, { useState } from 'react';
import { formatCurrency } from '../lib/utils';
import { Plus, Wallet, Landmark, CreditCard, Trash2, Edit3, X, Check, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';
import { Account } from '../types';

interface AccountsProps {
  accounts: Account[];
  onAdd: (a: Omit<Account, 'id'>) => void;
  onUpdate: (id: string, a: Partial<Account>) => void;
  onDelete: (id: string) => void;
  settings: any;
}

export const Accounts: React.FC<AccountsProps> = ({ accounts, onAdd, onUpdate, onDelete, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  const [formData, setFormData] = useState<{
    name: string;
    type: 'CASH' | 'BANK' | 'CREDIT_CARD';
    initialBalance: number;
    targetCurrentBalance: string; // Para ajuste direto de saldo atual se desejado
    creditLimit?: number;
    closingDay?: number;
    dueDay?: number;
  }>({
    name: '',
    type: 'BANK',
    initialBalance: 0,
    targetCurrentBalance: '',
    creditLimit: undefined,
    closingDay: 5,
    dueDay: 15,
  });

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setFormData({
      name: '',
      type: 'BANK',
      initialBalance: 0,
      targetCurrentBalance: '',
      creditLimit: undefined,
      closingDay: 5,
      dueDay: 15,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setFormData({
      name: acc.name,
      type: acc.type,
      initialBalance: acc.initialBalance || 0,
      targetCurrentBalance: (acc.balance !== undefined ? acc.balance : acc.initialBalance).toString(),
      creditLimit: acc.creditLimit,
      closingDay: acc.closingDay || 5,
      dueDay: acc.dueDay || 15,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return;
    let finalInitialBalance = Number(formData.initialBalance) || 0;

    if (editingAccount) {
      const originalInitial = editingAccount.initialBalance || 0;
      const originalCurrent = editingAccount.balance ?? originalInitial;
      const movement = originalCurrent - originalInitial; // soma dos lançamentos pagos
      const desiredCurrent = parseFloat(String(formData.targetCurrentBalance).replace(',', '.'));
      const initialChanged = Math.abs(finalInitialBalance - originalInitial) > 0.004;
      const currentChanged = !isNaN(desiredCurrent) && Math.abs(desiredCurrent - originalCurrent) > 0.004;

      if (currentChanged && initialChanged) {
        alert('Altere apenas o Saldo Atual OU o Saldo Inicial (um é calculado a partir do outro).');
        return;
      }
      if (currentChanged) {
        // Ajusta o saldo inicial para que o saldo atual fique igual ao informado
        finalInitialBalance = Math.round((desiredCurrent - movement) * 100) / 100;
      }
    }

    const payload: Omit<Account, 'id'> = {
      name: formData.name.trim(),
      type: formData.type,
      initialBalance: finalInitialBalance,
      ...(formData.type === 'CREDIT_CARD' ? {
        creditLimit: formData.creditLimit ? Number(formData.creditLimit) : undefined,
        closingDay: formData.closingDay ? Number(formData.closingDay) : undefined,
        dueDay: formData.dueDay ? Number(formData.dueDay) : undefined,
      } : {})
    };

    if (editingAccount) {
      onUpdate(editingAccount.id, payload);
    } else {
      onAdd(payload);
    }

    setIsModalOpen(false);
  };

  const handleDeleteAccount = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a conta "${name}"?`)) {
      onDelete(id);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'BANK':
        return <Landmark size={24} className="text-blue-500 dark:text-blue-400" />;
      case 'CREDIT_CARD':
        return <CreditCard size={24} className="text-purple-500 dark:text-purple-400" />;
      default:
        return <Wallet size={24} className="text-emerald-500 dark:text-emerald-400" />;
    }
  };

  const totalBalance = accounts.reduce((acc, a) => acc + (a.balance ?? a.initialBalance), 0);

  return (
    <div className="space-y-6">
      {/* Header & Total Balance Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            <DollarSign size={14} className="text-moura-orange-500" />
            <span>Patrimônio em Contas & Bancos</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(totalBalance, settings.currency)}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {accounts.length} {accounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'} no sistema
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-moura-orange-600 hover:bg-moura-orange-700 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-moura-orange-600/20"
        >
          <Plus size={20} />
          <span>Nova Conta / Banco</span>
        </button>
      </div>

      {/* Grid de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(acc => {
          const currentBal = acc.balance ?? acc.initialBalance;
          const isNegative = currentBal < 0;

          return (
            <div
              key={acc.id}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between"
            >
              <div>
                {/* Top card actions */}
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                    {getIcon(acc.type)}
                  </div>
                  
                  {/* Action buttons edit & delete */}
                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(acc)}
                      title="Editar conta e saldo"
                      className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                    >
                      <Edit3 size={17} />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(acc.id, acc.name)}
                      title="Excluir conta"
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 tracking-tight">
                  {acc.name}
                </h3>
                
                <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mb-4 mt-1">
                  {acc.type === 'BANK' ? '🏦 Instituição Bancária' : acc.type === 'CASH' ? '💵 Caixa / Espécie' : '💳 Cartão de Crédito'}
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
                      {acc.type === 'CREDIT_CARD' ? 'Saldo do Cartão' : 'Saldo Atual'}
                    </span>
                    <span className={`text-2xl font-extrabold ${isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                      {formatCurrency(currentBal, settings.currency)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(acc)}
                    className="text-xs font-bold text-moura-orange-600 dark:text-moura-orange-400 hover:underline flex items-center gap-1 mb-1 whitespace-nowrap"
                  >
                    <Edit3 size={13} /> Ajustar
                  </button>
                </div>

                {acc.initialBalance !== 0 && (
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 flex justify-between">
                    <span>Saldo Inicial:</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      {formatCurrency(acc.initialBalance, settings.currency)}
                    </span>
                  </div>
                )}

                {acc.type === 'CREDIT_CARD' && acc.creditLimit && (
                  <div className="mt-3 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Limite total:</span>
                      <span className="font-bold">{formatCurrency(acc.creditLimit, settings.currency)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Limite disponível:</span>
                      <span className="font-bold">{formatCurrency(acc.creditLimit + Math.min(0, currentBal), settings.currency)}</span>
                    </div>
                    {acc.closingDay && (
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Fechamento / Vencimento:</span>
                        <span>Dia {acc.closingDay} / Dia {acc.dueDay || '-'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Cadastro / Edição de Conta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-moura-orange-50 dark:bg-moura-orange-950/50 text-moura-orange-600 dark:text-moura-orange-400 rounded-xl">
                  {editingAccount ? <Edit3 size={20} /> : <Plus size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {editingAccount ? 'Editar Conta / Banco' : 'Cadastrar Nova Conta'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {editingAccount ? 'Atualize os dados e saldos desta conta' : 'Preencha as informações do novo banco ou caixa'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Nome da Conta / Banco *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sicredi PJ, Itaú, Caixinha da Loja"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-moura-orange-500 font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Tipo de Conta *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'BANK', label: 'Banco', icon: Landmark },
                    { id: 'CASH', label: 'Dinheiro', icon: Wallet },
                    { id: 'CREDIT_CARD', label: 'Cartão', icon: CreditCard },
                  ].map(item => {
                    const IconComponent = item.icon;
                    const isSelected = formData.type === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: item.id as any })}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border font-bold text-xs gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-moura-orange-50 dark:bg-moura-orange-950/40 border-moura-orange-500 text-moura-orange-600 dark:text-moura-orange-400 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <IconComponent size={18} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Saldo Atual & Saldo Inicial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {editingAccount ? 'Saldo Atual (R$)' : 'Saldo Inicial (R$)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-moura-orange-500 font-bold text-slate-900 dark:text-white"
                    value={editingAccount ? formData.targetCurrentBalance : formData.initialBalance}
                    onChange={e => {
                      if (editingAccount) {
                        setFormData({ ...formData, targetCurrentBalance: e.target.value });
                      } else {
                        setFormData({ ...formData, initialBalance: Number(e.target.value) });
                      }
                    }}
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    {editingAccount ? 'Informe o saldo real do banco hoje; o sistema ajusta o saldo inicial' : 'Valor de abertura da conta'}
                  </p>
                </div>

                {editingAccount && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Saldo Inicial (Base)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-moura-orange-500 font-medium text-slate-700 dark:text-slate-300"
                      value={formData.initialBalance}
                      onChange={e => setFormData({ ...formData, initialBalance: Number(e.target.value) })}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Ou altere o valor de abertura da conta
                    </p>
                  </div>
                )}
              </div>

              {/* Opções de Cartão de Crédito */}
              {formData.type === 'CREDIT_CARD' && (
                <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/40 space-y-3 mt-2">
                  <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard size={14} /> Detalhes do Cartão de Crédito
                  </h4>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Limite de Crédito Total (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 5000.00"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-medium dark:text-slate-100 text-xs"
                      value={formData.creditLimit || ''}
                      onChange={e => setFormData({ ...formData, creditLimit: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Dia do Fechamento
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="Ex: 5"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-medium dark:text-slate-100 text-xs"
                        value={formData.closingDay || ''}
                        onChange={e => setFormData({ ...formData, closingDay: e.target.value ? Number(e.target.value) : undefined })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Dia do Vencimento
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="Ex: 15"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-medium dark:text-slate-100 text-xs"
                        value={formData.dueDay || ''}
                        onChange={e => setFormData({ ...formData, dueDay: e.target.value ? Number(e.target.value) : undefined })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 font-bold bg-moura-orange-600 hover:bg-moura-orange-700 text-white rounded-xl shadow-md shadow-moura-orange-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  <span>{editingAccount ? 'Salvar Alterações' : 'Cadastrar Conta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
