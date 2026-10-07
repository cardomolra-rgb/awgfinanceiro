import React, { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Category, TransactionType, DREGroup } from '../types';

interface CategoriesProps {
  categories: Category[];
  onAdd: (c: Omit<Category, 'id'>) => void;
  onUpdate: (id: string, c: Partial<Category>) => void;
  onDelete: (id: string) => void;
  costCenters: string[];
}

export const DRE_GROUP_LABELS: Record<DREGroup, string> = {
  [DREGroup.REVENUE]: 'Receita Bruta',
  [DREGroup.TAXES]: 'Impostos e Deduções',
  [DREGroup.OPERATIVE_COST]: 'Custos Operacionais',
  [DREGroup.ADMIN_EXPENSE]: 'Despesas Administrativas',
  [DREGroup.MARKETING]: 'Despesas com Marketing',
  [DREGroup.OTHER]: 'Outras Despesas',
  [DREGroup.EXCLUDED]: 'Fora da DRE (sócios, empréstimos, aplicações)',
};

const EXPENSE_GROUPS = [DREGroup.TAXES, DREGroup.OPERATIVE_COST, DREGroup.ADMIN_EXPENSE, DREGroup.MARKETING, DREGroup.OTHER, DREGroup.EXCLUDED];
const INCOME_GROUPS = [DREGroup.REVENUE, DREGroup.EXCLUDED];

const emptyForm = (): Omit<Category, 'id'> => ({ name: '', type: TransactionType.EXPENSE, color: '#F05523', dreGroup: DREGroup.ADMIN_EXPENSE, costCenters: [] });

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  INCOME: { label: 'Receita', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  EXPENSE: { label: 'Despesa', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  TRANSFER: { label: 'Transferência', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  BOTH: { label: 'Ambos', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

const Categories: React.FC<CategoriesProps> = ({ categories, onAdd, onUpdate, onDelete, costCenters }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Omit<Category, 'id'>>(emptyForm());

  const openNew = () => { setEditing(null); setFormData(emptyForm()); setIsOpen(true); };
  const openEdit = (c: Category) => {
    setEditing(c);
    setFormData({ name: c.name, type: c.type, color: c.color, dreGroup: c.dreGroup, parentId: c.parentId, costCenters: c.costCenters || [] });
    setIsOpen(true);
  };

  const setType = (type: Category['type']) => {
    let dreGroup = formData.dreGroup;
    if (type === TransactionType.INCOME && dreGroup !== DREGroup.EXCLUDED) dreGroup = DREGroup.REVENUE;
    else if (type === TransactionType.EXPENSE && (!dreGroup || dreGroup === DREGroup.REVENUE)) dreGroup = DREGroup.ADMIN_EXPENSE;
    setFormData({ ...formData, type, dreGroup });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    if (!name) return;
    const duplicate = categories.some(c => c.id !== editing?.id && c.name.trim().toLowerCase() === name.toLowerCase() && c.type === formData.type);
    if (duplicate) { alert('Já existe uma categoria com esse nome e tipo.'); return; }
    const payload = { ...formData, name };
    if (editing) onUpdate(editing.id, payload); else onAdd(payload);
    setIsOpen(false);
  };

  const dreOptions = formData.type === TransactionType.INCOME ? INCOME_GROUPS : EXPENSE_GROUPS;

  const toggleCostCenter = (cc: string) => {
    const current = formData.costCenters || [];
    setFormData({ ...formData, costCenters: current.includes(cc) ? current.filter(x => x !== cc) : [...current, cc] });
  };

  // Lista agrupada por centro de custo para facilitar a conferência
  const [ccFilter, setCcFilter] = useState('ALL');
  const typeOrder: Record<string, number> = { INCOME: 0, EXPENSE: 1, BOTH: 2, TRANSFER: 3 };
  const visible = categories
    .filter(c => ccFilter === 'ALL'
      || (ccFilter === 'NONE' ? !(c.costCenters && c.costCenters.length) : (!c.costCenters?.length || c.costCenters.includes(ccFilter))))
    .sort((a, b) => (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9) || a.name.localeCompare(b.name, 'pt-BR'));
  const isTransfer = formData.type === TransactionType.TRANSFER;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Categorias Financeiras</h2>
          <select value={ccFilter} onChange={e => setCcFilter(e.target.value)}
            className="mt-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none">
            <option value="ALL">Todos os centros de custo</option>
            {costCenters.map(cc => <option key={cc} value={cc}>{cc}</option>)}
            <option value="NONE">Categorias gerais (todos os centros)</option>
          </select>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-moura-orange-600 text-white rounded-lg hover:bg-moura-orange-700 transition-colors shadow-sm font-semibold">
          <Plus size={18} /> Nova Categoria
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
              <tr>
                <th className="px-6 py-4">Cor</th>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Grupo na DRE</th>
                <th className="px-6 py-4">Centros de Custo</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visible.map(cat => {
                const badge = TYPE_BADGE[cat.type] || TYPE_BADGE.EXPENSE;
                return (
                  <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4"><div className="w-6 h-6 rounded-full border border-white dark:border-slate-800 shadow-sm" style={{ backgroundColor: cat.color }} /></td>
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-100">{cat.name}</td>
                    <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 rounded-full text-xs font-bold ${badge.cls}`}>{badge.label}</span></td>
                    <td className="px-6 py-4 text-sm">
                      {cat.type === TransactionType.TRANSFER ? <span className="text-slate-400">—</span>
                        : cat.dreGroup ? <span className="text-slate-600 dark:text-slate-300">{DRE_GROUP_LABELS[cat.dreGroup]}</span>
                          : <span className="text-amber-600 dark:text-amber-400 font-semibold">Não classificada</span>}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {cat.type === TransactionType.TRANSFER ? <span className="text-slate-400">—</span>
                        : cat.costCenters && cat.costCenters.length
                          ? <div className="flex flex-wrap gap-1">{cat.costCenters.map(cc => <span key={cc} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">{cc}</span>)}</div>
                          : <span className="text-slate-400">Todos</span>}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(cat)} title="Editar" className="p-1.5 text-moura-orange-600 hover:bg-moura-orange-50 dark:hover:bg-moura-orange-900/30 rounded-lg transition-colors"><Edit2 size={18} /></button>
                      <button onClick={() => onDelete(cat.id)} title="Excluir" className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-100">{editing ? 'Editar Categoria' : 'Nova Categoria'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Nome da Categoria</label>
                <input type="text" required autoFocus
                  className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-moura-orange-500"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              {!isTransfer && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Tipo</label>
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <button type="button" onClick={() => setType(TransactionType.INCOME)}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${formData.type === TransactionType.INCOME ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Receita</button>
                    <button type="button" onClick={() => setType(TransactionType.EXPENSE)}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${formData.type === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Despesa</button>
                  </div>
                </div>
              )}
              {!isTransfer && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Grupo na DRE</label>
                  <select value={formData.dreGroup || ''} onChange={e => setFormData({ ...formData, dreGroup: e.target.value as DREGroup })}
                    className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-moura-orange-500">
                    {dreOptions.map(g => <option key={g} value={g} className="dark:bg-slate-900">{DRE_GROUP_LABELS[g]}</option>)}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">Define em qual linha do relatório DRE esta categoria aparece.</p>
                </div>
              )}
              {!isTransfer && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Aparece nos centros de custo</label>
                  <div className="flex flex-wrap gap-2">
                    {costCenters.map(cc => {
                      const on = (formData.costCenters || []).includes(cc);
                      return (
                        <button key={cc} type="button" onClick={() => toggleCostCenter(cc)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${on
                            ? 'bg-moura-orange-50 border-moura-orange-500 text-moura-orange-700 dark:bg-moura-orange-900/30 dark:text-moura-orange-300'
                            : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
                          {on ? '✓ ' : ''}{cc}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Nenhum marcado = aparece em todos os centros de custo.</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Cor de Identificação</label>
                <input type="color" className="w-full h-10 p-0 border-none rounded cursor-pointer bg-transparent"
                  value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 py-2 font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-2 font-bold bg-moura-orange-600 text-white rounded-lg hover:bg-moura-orange-700 transition-colors shadow-sm">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
