import React, { useState } from 'react';
import { Plus, Users, Search, Trash2, Mail, Phone, Building2, Edit2, Repeat, UserCheck } from 'lucide-react';
import { Entity } from '../types';

interface EntitiesProps {
  entities: Entity[];
  onAdd: (e: Omit<Entity, 'id'>) => void;
  onUpdate: (id: string, e: Partial<Entity>) => void;
  onDelete: (id: string) => void;
}

const TYPE_LABEL: Record<Entity['type'], string> = { CLIENT: 'Cliente', SUPPLIER: 'Fornecedor', BOTH: 'Cliente e Fornecedor', EMPLOYEE: 'Colaborador' };
const emptyForm = (): Omit<Entity, 'id'> => ({ name: '', type: 'CLIENT', email: '', phone: '' });

const Entities: React.FC<EntitiesProps> = ({ entities, onAdd, onUpdate, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Entity | null>(null);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | Entity['type']>('ALL');
  const [formData, setFormData] = useState<Omit<Entity, 'id'>>(emptyForm());

  const openNew = () => { setEditing(null); setFormData(emptyForm()); setIsOpen(true); };
  const openEdit = (e: Entity) => {
    setEditing(e);
    setFormData({ name: e.name, type: e.type, email: e.email || '', phone: e.phone || '' });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    if (!name) return;
    const payload = { ...formData, name, email: formData.email?.trim(), phone: formData.phone?.trim() };
    if (editing) onUpdate(editing.id, payload); else onAdd(payload);
    setIsOpen(false);
  };

  const q = filter.trim().toLowerCase();
  const filtered = entities
    .filter(e => typeFilter === 'ALL' || e.type === typeFilter || (e.type === 'BOTH' && (typeFilter === 'CLIENT' || typeFilter === 'SUPPLIER')))
    .filter(e => !q || e.name.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || e.phone?.includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const inputCls = 'w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-moura-orange-500';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Contatos (Clientes, Fornecedores & Colaboradores)</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Pesquisar..." value={filter} onChange={e => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-moura-orange-500 text-sm" />
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-moura-orange-600 text-white rounded-lg hover:bg-moura-orange-700 whitespace-nowrap transition-colors shadow-sm font-semibold">
            <Plus size={18} /> Adicionar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-fit gap-1">
        {([['ALL', 'Todos'], ['CLIENT', 'Clientes'], ['SUPPLIER', 'Fornecedores'], ['EMPLOYEE', 'Colaboradores']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTypeFilter(id)}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all ${typeFilter === id ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
            {label} <span className="text-xs font-semibold text-slate-400">({id === 'ALL' ? entities.length : entities.filter(e => e.type === id || (e.type === 'BOTH' && id !== 'EMPLOYEE')).length})</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(ent => (
          <div key={ent.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative group">
            <div className="absolute top-3 right-3 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(ent)} title="Editar" className="p-1.5 text-slate-400 hover:text-moura-orange-600"><Edit2 size={16} /></button>
              <button onClick={() => onDelete(ent.id)} title="Excluir" className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
            </div>
            <div className="flex items-center gap-4 mb-4 pr-16">
              <div className={`p-3 rounded-full ${ent.type === 'CLIENT' ? 'bg-moura-orange-50 text-moura-orange-600 dark:bg-moura-orange-900/30 dark:text-moura-orange-400' : ent.type === 'SUPPLIER' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : ent.type === 'EMPLOYEE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                {ent.type === 'CLIENT' ? <Users size={20} /> : ent.type === 'SUPPLIER' ? <Building2 size={20} /> : ent.type === 'EMPLOYEE' ? <UserCheck size={20} /> : <Repeat size={20} />}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">{ent.name}</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{TYPE_LABEL[ent.type] || 'Contato'}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 truncate"><Mail size={14} /> {ent.email || '—'}</div>
              <div className="flex items-center gap-2"><Phone size={14} /> {ent.phone || '—'}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            {entities.length === 0 ? 'Nenhum contato cadastrado.' : 'Nenhum contato encontrado.'}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-6 dark:text-slate-100">{editing ? 'Editar Contato' : 'Novo Contato'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Nome Completo / Razão Social</label>
                <input type="text" required autoFocus className={inputCls} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Tipo</label>
                <select className={inputCls} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as Entity['type'] })}>
                  <option value="CLIENT" className="dark:bg-slate-900">Cliente</option>
                  <option value="SUPPLIER" className="dark:bg-slate-900">Fornecedor</option>
                  <option value="EMPLOYEE" className="dark:bg-slate-900">Colaborador</option>
                  <option value="BOTH" className="dark:bg-slate-900">Cliente e Fornecedor</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">E-mail</label>
                  <input type="email" className={inputCls} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Telefone</label>
                  <input type="tel" className={inputCls} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
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

export default Entities;
