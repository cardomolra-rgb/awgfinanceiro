import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Tag, CreditCard, User, Layers, ArrowLeftRight, Repeat, AlertCircle } from 'lucide-react';
import { Transaction, Category, Account, Entity, TransactionType, TransactionStatus, PaymentMethod } from '../types';
import { todayISO } from '../lib/dates';
import { splitInstallments } from '../lib/finance';
import { formatCurrency } from '../lib/utils';

/** Categorias válidas para o tipo de lançamento. */
const categoriesFor = (categories: Category[], type: TransactionType) =>
  categories
    .filter(c => c.type === type || (c.type === 'BOTH' && type !== TransactionType.TRANSFER))
    // Ordem alfabética; categorias "BOTH" (ex.: A Classificar) no fim
    .sort((a, b) => Number(a.type === 'BOTH') - Number(b.type === 'BOTH') || a.name.localeCompare(b.name, 'pt-BR'));

/** Categorias ligadas ao centro de custo (sem centros definidos = aparece em todos). Se nenhuma bater, mostra todas. */
const categoriesForCostCenter = (list: Category[], costCenter: string) => {
  const filtered = list.filter(c => !c.costCenters?.length || c.costCenters.includes(costCenter));
  return filtered.length ? filtered : list;
};

interface TransactionModalProps {
  onClose: () => void;
  onSave: (data: any, installmentsCount?: number) => void;
  categories: Category[];
  accounts: Account[];
  entities: Entity[];
  costCenters?: string[];
  initialData?: Transaction;
  initialType?: TransactionType;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  onClose,
  onSave,
  categories,
  accounts,
  entities,
  costCenters = ['Operacional', 'Marketing & Vendas', 'Administrativo', 'Tecnologia / TI'],
  initialData,
  initialType,
}) => {
  const startType = initialData?.type || initialType || TransactionType.EXPENSE;
  /** Mantém a categoria se ainda for válida; transferência usa a categoria própria; senão o usuário escolhe. */
  const pickCategory = (type: TransactionType, current?: string, costCenter?: string) => {
    const valid = categoriesFor(categories, type);
    const scoped = costCenter ? categoriesForCostCenter(valid, costCenter) : valid;
    if (scoped.some(c => c.id === current)) return current!;
    if (type === TransactionType.TRANSFER) return valid[0]?.id || '';
    return '';
  };
  const ccList = initialData?.costCenter && !costCenters.includes(initialData.costCenter)
    ? [...costCenters, initialData.costCenter] : costCenters;

  const [formData, setFormData] = useState({
    type: startType,
    description: initialData?.description || '',
    amount: initialData?.amount || '',
    accrualDate: initialData?.accrualDate || todayISO(),
    dueDate: initialData?.dueDate || initialData?.accrualDate || todayISO(),
    paymentDate: initialData?.paymentDate || todayISO(),
    categoryId: pickCategory(startType, initialData?.categoryId),
    accountId: initialData?.accountId || accounts[0]?.id || '',
    destinationAccountId: initialData?.destinationAccountId || accounts.find(a => a.id !== (initialData?.accountId || accounts[0]?.id))?.id || '',
    entityId: initialData?.entityId || '',
    paymentMethod: initialData?.paymentMethod || PaymentMethod.PIX,
    status: initialData?.status || TransactionStatus.PAID,
    observations: initialData?.observations || '',
    isRecurring: initialData?.isRecurring || false,
    recurrencePeriod: initialData?.recurrencePeriod || ('MONTHLY' as 'MONTHLY' | 'WEEKLY' | 'YEARLY'),
    costCenter: initialData?.costCenter || ccList[0] || 'Operacional',
  });

  const [displayAmount, setDisplayAmount] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [errors, setErrors] = useState<{ description?: string; amount?: string; general?: string }>({});
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);

  // Inicializar o displayAmount se houver initialData
  useEffect(() => {
    if (initialData?.amount) {
      setDisplayAmount(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(initialData.amount));
    }
  }, [initialData]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setDisplayAmount('');
      setFormData({ ...formData, amount: '' });
      setErrors({ ...errors, amount: undefined });
      return;
    }
    const num = parseInt(val, 10) / 100;
    setDisplayAmount(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(num));
    setFormData({ ...formData, amount: num });
    if (errors.amount) setErrors({ ...errors, amount: undefined });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, description: e.target.value });
    if (errors.description) setErrors({ ...errors, description: undefined });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { description?: string; amount?: string; general?: string } = {};
    
    if (!formData.description.trim()) {
      newErrors.description = 'A descrição é obrigatória.';
    }
    
    if (!formData.amount || Number(formData.amount) <= 0) {
      newErrors.amount = 'Informe um valor válido maior que zero.';
    }

    if (!formData.accountId) {
      newErrors.general = 'Cadastre ou selecione uma conta.';
    } else if (formData.type === TransactionType.TRANSFER) {
      if (!formData.destinationAccountId) newErrors.general = 'Selecione a conta de destino.';
      else if (formData.destinationAccountId === formData.accountId) newErrors.general = 'A conta de destino deve ser diferente da conta de origem.';
    } else if (!formData.categoryId) {
      newErrors.general = 'Selecione uma categoria (cadastre uma em Categorias, se necessário).';
    }
    if (!formData.accrualDate || !formData.dueDate) newErrors.general = 'Preencha as datas de competência e vencimento.';
    if (formData.status === TransactionStatus.PAID && !formData.paymentDate) newErrors.general = 'Informe a data do pagamento.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: any = {
      ...formData,
      amount: Number(formData.amount),
      paymentDate: formData.status === TransactionStatus.PAID ? formData.paymentDate : undefined,
      entityId: formData.type === TransactionType.TRANSFER ? undefined : (formData.entityId || undefined),
      destinationAccountId: formData.type === TransactionType.TRANSFER ? formData.destinationAccountId : undefined,
      isRecurring: formData.type === TransactionType.TRANSFER || isInstallment ? false : formData.isRecurring,
    };

    onSave(payload, isInstallment ? installmentsCount : 1);
  };

  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[88vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 my-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/60 shrink-0 sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            {initialData ? <ArrowLeftRight className="w-5 h-5 text-moura-orange-500" /> : <DollarSign className="w-5 h-5 text-emerald-500" />}
            {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
            title="Fechar (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700 dark:text-slate-200 custom-scrollbar">
          {/* Selector de Tipo (Receita, Despesa, Transferência) */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl gap-1">
            {(['EXPENSE', 'INCOME', 'TRANSFER'] as TransactionType[]).map((type) => {
              const labels = {
                EXPENSE: 'Despesa',
                INCOME: 'Receita',
                TRANSFER: 'Transferência'
              };
              const isActive = formData.type === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, type, categoryId: pickCategory(type, formData.categoryId, showAllCategories ? undefined : formData.costCenter) });
                    setErrors({});
                  }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
                    isActive 
                      ? type === 'EXPENSE' ? 'bg-rose-500 text-white shadow-md transform scale-[1.02]' 
                        : type === 'INCOME' ? 'bg-emerald-500 text-white shadow-md transform scale-[1.02]'
                        : 'bg-moura-orange-500 text-white shadow-md transform scale-[1.02]'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {labels[type]}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Descrição *</label>
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  value={formData.description}
                  onChange={handleDescriptionChange}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border rounded-xl focus:ring-2 outline-none dark:text-slate-100 text-sm font-medium transition-all ${errors.description ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-moura-orange-500 focus:ring-moura-orange-500/20'}`}
                  placeholder={formData.type === TransactionType.TRANSFER ? 'Ex: Transferência para Investimentos' : 'Ex: Aluguel mensal, Venda consultoria'}
                />
                {errors.description && (
                  <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-rose-500 text-[10px] font-medium">
                    <AlertCircle size={10} /> {errors.description}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Valor *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-bold text-sm">R$</span>
                </div>
                <input
                  type="text"
                  value={displayAmount}
                  onChange={handleAmountChange}
                  className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border rounded-xl focus:ring-2 outline-none dark:text-slate-100 text-sm font-bold transition-all ${errors.amount ? 'border-rose-500 focus:ring-rose-500/20 text-rose-600 dark:text-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-moura-orange-500 focus:ring-moura-orange-500/20'}`}
                  placeholder="0,00"
                />
                {errors.amount && (
                  <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-rose-500 text-[10px] font-medium whitespace-nowrap">
                    <AlertCircle size={10} /> {errors.amount}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Centro de Custo</label>
              <select
                value={formData.costCenter}
                onChange={e => setFormData({
                  ...formData,
                  costCenter: e.target.value,
                  categoryId: pickCategory(formData.type, formData.categoryId, showAllCategories ? undefined : e.target.value),
                })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 outline-none dark:text-slate-100 text-sm font-medium transition-all"
              >
                {ccList.map(cc => (
                  <option key={cc} value={cc}>{cc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Competência</label>
              <input
                type="date"
                value={formData.accrualDate}
                onChange={e => setFormData({ ...formData, accrualDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 outline-none dark:text-slate-100 text-sm font-medium transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Vencimento</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 outline-none dark:text-slate-100 text-sm font-medium transition-all"
              />
            </div>

            {/* Se for TRANSFERÊNCIA: mostra Origem e Destino */}
            {formData.type === TransactionType.TRANSFER ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Conta de Origem</label>
                  <select
                    value={formData.accountId}
                    onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 outline-none dark:text-slate-100 text-sm font-medium transition-all"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Conta de Destino</label>
                  <select
                    value={formData.destinationAccountId}
                    onChange={e => setFormData({ ...formData, destinationAccountId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 outline-none dark:text-slate-100 text-sm font-medium transition-all"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">{formData.type === TransactionType.EXPENSE ? 'Fornecedor / Colaborador' : 'Cliente'}</label>
                  <select
                    value={formData.entityId}
                    onChange={e => setFormData({ ...formData, entityId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 outline-none dark:text-slate-100 text-sm font-medium transition-all"
                  >
                    <option value="">Nenhum contato selecionado</option>
                    {entities.filter(ent => formData.type === TransactionType.EXPENSE ? ent.type !== 'CLIENT' : (ent.type === 'CLIENT' || ent.type === 'BOTH')).map(ent => (
                      <option key={ent.id} value={ent.id}>{ent.name}{ent.type === 'EMPLOYEE' ? ' (colaborador)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Categoria *</label>
                    <button type="button" onClick={() => setShowAllCategories(v => !v)}
                      className="text-[10px] font-bold text-moura-orange-600 dark:text-moura-orange-400 hover:underline">
                      {showAllCategories ? 'Só do centro de custo' : 'Mostrar todas'}
                    </button>
                  </div>
                  {(() => {
                    const all = categoriesFor(categories, formData.type);
                    let options = showAllCategories ? all : categoriesForCostCenter(all, formData.costCenter);
                    const selected = all.find(c => c.id === formData.categoryId);
                    if (selected && !options.includes(selected)) options = [selected, ...options];
                    return (
                      <select
                        value={formData.categoryId}
                        onChange={e => { setFormData({ ...formData, categoryId: e.target.value }); if (errors.general) setErrors({ ...errors, general: undefined }); }}
                        className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border rounded-xl focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 outline-none dark:text-slate-100 text-sm font-medium transition-all ${!formData.categoryId && errors.general ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <option value="">{all.length === 0 ? 'Nenhuma categoria cadastrada' : 'Selecione a categoria...'}</option>
                        {options.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Conta</label>
                  <select
                    value={formData.accountId}
                    onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 outline-none dark:text-slate-100 text-sm font-medium transition-all"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as TransactionStatus })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 outline-none dark:text-slate-100 text-sm font-medium transition-all"
              >
                <option value={TransactionStatus.PLANNED}>Previsto (Em aberto)</option>
                <option value={TransactionStatus.PAID}>{formData.type === TransactionType.INCOME ? 'Recebido' : 'Pago / Concluído'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Método</label>
              <select
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 outline-none dark:text-slate-100 text-sm font-medium transition-all"
              >
                <option value={PaymentMethod.PIX}>PIX</option>
                <option value={PaymentMethod.BOLETO}>Boleto</option>
                <option value={PaymentMethod.CREDIT_CARD}>Cartão de Crédito</option>
                <option value={PaymentMethod.TRANSFER}>Transferência</option>
                <option value={PaymentMethod.CASH}>Dinheiro</option>
              </select>
            </div>

            {formData.status === TransactionStatus.PAID && (
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Data do {formData.type === TransactionType.INCOME ? 'Recebimento' : 'Pagamento'}
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 outline-none dark:text-slate-100 text-sm font-medium transition-all"
                />
                {isInstallment && <p className="text-[11px] text-slate-500 mt-1">Só a 1ª parcela será marcada como paga; as demais ficam em aberto.</p>}
              </div>
            )}
          </div>

          {/* Opção de Parcelamento */}
          {!initialData && formData.type !== TransactionType.TRANSFER && (
            <div className={`p-4 rounded-xl border transition-all ${isInstallment ? 'bg-purple-50/50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700'}`}>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className={`p-2 rounded-lg transition-colors ${isInstallment ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                  <Layers size={18} />
                </div>
                <div className="flex-1">
                  <span className={`text-sm font-bold transition-colors ${isInstallment ? 'text-purple-800 dark:text-purple-300' : 'text-slate-700 dark:text-slate-300'}`}>Parcelar Lançamento?</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Gera parcelas mensais automáticas.</p>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={isInstallment}
                    onChange={e => {
                      setIsInstallment(e.target.checked);
                      if (e.target.checked) setFormData(f => ({ ...f, isRecurring: false }));
                    }}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors relative ${isInstallment ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow transition-transform duration-200 ${isInstallment ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                </div>
              </label>

              {isInstallment && (
                <div className="mt-4 pt-4 border-t border-purple-100 dark:border-purple-800/50 flex items-center justify-between animate-fadeIn">
                  <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">Número de Parcelas:</span>
                  <select
                    value={installmentsCount}
                    onChange={e => setInstallmentsCount(parseInt(e.target.value, 10))}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-xl font-bold text-purple-700 dark:text-purple-300 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all shadow-sm cursor-pointer"
                  >
                    {[2,3,4,5,6,7,8,9,10,11,12,18,24,36].map(num => (
                      <option key={num} value={num}>
                        {num}x de {formatCurrency(splitInstallments(Number(formData.amount) || 0, num)[0])}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Recorrência */}
          {formData.type !== TransactionType.TRANSFER && !isInstallment && (
          <div className={`p-4 rounded-xl border transition-all ${formData.isRecurring ? 'bg-moura-orange-50/50 border-moura-orange-200 dark:bg-moura-orange-900/10 dark:border-moura-orange-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700'}`}>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className={`p-2 rounded-lg transition-colors ${formData.isRecurring ? 'bg-moura-orange-100 text-moura-orange-600 dark:bg-moura-orange-900/50 dark:text-moura-orange-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                <Repeat size={18} />
              </div>
              <div className="flex-1">
                <span className={`text-sm font-bold transition-colors ${formData.isRecurring ? 'text-moura-orange-800 dark:text-moura-orange-300' : 'text-slate-700 dark:text-slate-300'}`}>Lançamento Fixo / Recorrente?</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Repete automaticamente (aluguel, salários, mensalidades...).</p>
              </div>
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors relative ${formData.isRecurring ? 'bg-moura-orange-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow transition-transform duration-200 ${formData.isRecurring ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </label>

            {formData.isRecurring && (
              <div className="mt-4 pt-4 border-t border-moura-orange-100 dark:border-moura-orange-800/50 flex items-center justify-between animate-fadeIn">
                <span className="text-sm font-semibold text-moura-orange-900 dark:text-moura-orange-200">Frequência da Recorrência:</span>
                <select
                  value={formData.recurrencePeriod || 'MONTHLY'}
                  onChange={e => setFormData({ ...formData, recurrencePeriod: e.target.value as any })}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-moura-orange-300 dark:border-moura-orange-700 rounded-xl font-bold text-moura-orange-700 dark:text-moura-orange-300 focus:ring-2 focus:ring-moura-orange-500/20 outline-none transition-all shadow-sm cursor-pointer"
                >
                  <option value="MONTHLY">Mensal</option>
                  <option value="WEEKLY">Semanal</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </div>
            )}
            {formData.isRecurring && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
                As próximas ocorrências são criadas automaticamente em aberto (até ~45 dias à frente). Para encerrar, edite e desmarque esta opção.
              </p>
            )}
          </div>
          )}

          {errors.general && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={14} /> {errors.general}
            </div>
          )}

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-[2] py-3.5 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 text-sm ${
                formData.type === TransactionType.EXPENSE ? 'bg-rose-600 shadow-rose-200 dark:shadow-none' :
                formData.type === TransactionType.INCOME ? 'bg-emerald-600 shadow-emerald-200 dark:shadow-none' :
                'bg-moura-orange-600 shadow-moura-orange-200 dark:shadow-none'
              }`}
            >
              Confirmar {formData.type === TransactionType.EXPENSE ? 'Despesa' : formData.type === TransactionType.INCOME ? 'Receita' : 'Transferência'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
