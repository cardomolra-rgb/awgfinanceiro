
import React, { useState } from 'react';
import { Save, Upload, Download, RefreshCw, AlertTriangle, Trash2, Database, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import ImportHistory from './ImportHistory';
import { CompanySettings, ImportRecord, Account, Transaction } from '../types';
import { SyncStatus } from '../lib/supabaseSync';

interface SettingsProps {
  settings: CompanySettings;
  onUpdate: (s: CompanySettings) => void;
  onExport: () => void;
  onImport: () => void;
  lastBackupAt?: string;
  importHistory: ImportRecord[];
  accounts: Account[];
  transactions: Transaction[];
  onUndoImport: (id: string) => void;
  onDeleteAllTransactions: () => void;
  supabaseStatus?: SyncStatus & { syncing: boolean };
  onSyncToSupabase?: () => Promise<{ success: boolean; message: string }>;
  onRefreshSupabaseStatus?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, onUpdate, onExport, onImport, lastBackupAt, importHistory, accounts, transactions, onUndoImport, onDeleteAllTransactions,
  supabaseStatus, onSyncToSupabase, onRefreshSupabaseStatus 
}) => {
  const [form, setForm] = useState<CompanySettings>(settings);
  const [confirmText, setConfirmText] = useState('');
  const [syncingManual, setSyncingManual] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(form);
    alert('Configurações salvas!');
  };

  /** Reduz o logo para no máximo 256px (PNG) — imagens grandes estouram o armazenamento do navegador. */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Selecione um arquivo de imagem.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Imagem muito grande (limite de 5 MB).'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setForm(f => ({ ...f, logoUrl: canvas.toDataURL('image/png') }));
      };
      img.onerror = () => alert('Não foi possível ler esta imagem.');
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <h2 className="text-xl font-bold mb-6 dark:text-slate-100">Identidade Visual & Empresa</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome da Empresa</label>
                <input 
                  type="text" 
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-moura-orange-500 dark:text-slate-100 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Moeda Padrão</label>
                <select 
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value })}
                  className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-slate-100 transition-colors"
                >
                  <option value="BRL" className="dark:bg-slate-900">Real (BRL)</option>
                  <option value="USD" className="dark:bg-slate-900">Dólar (USD)</option>
                  <option value="EUR" className="dark:bg-slate-900">Euro (EUR)</option>
                </select>
              </div>

              <div>
                 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Rodapé dos Relatórios</label>
                 <textarea 
                  value={form.footerText}
                  onChange={e => setForm({ ...form, footerText: e.target.value })}
                  className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none h-24 dark:text-slate-100 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Logo da Empresa</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Upload className="text-slate-300 dark:text-slate-500" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    id="logo-upload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                  {form.logoUrl && (
                    <button type="button" onClick={() => setForm({ ...form, logoUrl: undefined })}
                      className="px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">
                      Remover
                    </button>
                  )}
                  <label 
                    htmlFor="logo-upload"
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Alterar Logo
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Primária</label>
                    <input 
                      type="color" 
                      value={form.primaryColor}
                      onChange={e => setForm({ ...form, primaryColor: e.target.value })}
                      className="w-full h-10 p-0 border-none rounded cursor-pointer bg-transparent"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Secundária</label>
                    <input 
                      type="color" 
                      value={form.secondaryColor}
                      onChange={e => setForm({ ...form, secondaryColor: e.target.value })}
                      className="w-full h-10 p-0 border-none rounded cursor-pointer bg-transparent"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Destaque</label>
                    <input 
                      type="color" 
                      value={form.accentColor}
                      onChange={e => setForm({ ...form, accentColor: e.target.value })}
                      className="w-full h-10 p-0 border-none rounded cursor-pointer bg-transparent"
                    />
                 </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800/60">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 text-white font-bold rounded-xl shadow-lg shadow-moura-orange-200/50 dark:shadow-none transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: form.primaryColor }}
            >
              <Save size={18} />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="font-bold mb-4 flex items-center gap-2 dark:text-slate-100">
            <Download size={18} className="text-slate-400" />
            Backup e Exportação
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Os dados ficam salvos apenas neste navegador. Baixe um backup com frequência (ex.: toda semana) e guarde no Google Drive.</p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
            Último backup: {lastBackupAt
              ? new Date(lastBackupAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
              : <span className="text-amber-600 dark:text-amber-400">nunca feito</span>}
          </p>
          <button 
            onClick={onExport}
            className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Baixar Backup (.json)
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="font-bold mb-4 flex items-center gap-2 dark:text-slate-100">
            <RefreshCw size={18} className="text-slate-400" />
            Importação de Dados
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Importe extratos bancários (OFX ou CSV) ou restaure um backup (.json).</p>
          <button 
            onClick={onImport}
            className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Importar Arquivo
          </button>
        </div>
      </div>

      {/* Supabase Integration Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Database size={20} className="text-emerald-500" />
            Integração Supabase (Banco na Nuvem)
          </h3>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            supabaseStatus?.tablesExist
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              : supabaseStatus?.connected
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {supabaseStatus?.tablesExist ? (
              <><CheckCircle size={14} /> Ativo e Sincronizado</>
            ) : supabaseStatus?.connected ? (
              <><AlertCircle size={14} /> Conectado (Aguardando Migração)</>
            ) : (
              <><AlertCircle size={14} /> Desconectado</>
            )}
          </span>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          Projeto Supabase Ref: <code className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs text-moura-orange-600 dark:text-moura-orange-400">mdcymhgqzvdrojasuxhb</code>
          <br />
          {supabaseStatus?.message}
        </p>

        {supabaseStatus?.tablesExist ? (
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={syncingManual || supabaseStatus?.syncing}
                onClick={async () => {
                  if (!onSyncToSupabase) return;
                  setSyncingManual(true);
                  setSyncFeedback(null);
                  const res = await onSyncToSupabase();
                  setSyncFeedback(res.message);
                  setSyncingManual(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={syncingManual || supabaseStatus?.syncing ? 'animate-spin' : ''} />
                Subir dados para o Supabase agora
              </button>

              <button
                type="button"
                onClick={() => onRefreshSupabaseStatus && onRefreshSupabaseStatus()}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Verificar Conexão
              </button>
            </div>

            {syncFeedback && (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                {syncFeedback}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Para ativas as tabelas <strong>awg_</strong> no Supabase, execute a migração SQL gerada no <strong>SQL Editor</strong> do painel Supabase:
            </p>
            <div className="text-xs font-mono bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto max-h-32">
              supabase/migrations/20261007000000_create_awg_tables.sql
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onRefreshSupabaseStatus && onRefreshSupabaseStatus()}
                className="flex items-center gap-2 px-4 py-2 bg-moura-orange-500 hover:bg-moura-orange-600 text-white font-bold rounded-lg text-xs transition-colors"
              >
                <RefreshCw size={14} />
                Re-verificar após aplicar SQL
              </button>
            </div>
          </div>
        )}
      </div>

      <ImportHistory
        history={importHistory}
        accounts={accounts}
        transactions={transactions}
        currency={settings.currency}
        onUndo={onUndoImport}
      />

      {/* Zona de perigo */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-rose-200 dark:border-rose-900/60 shadow-sm">
        <h3 className="font-bold mb-1 flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <AlertTriangle size={18} />
          Excluir todos os lançamentos
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Apaga os <strong>{transactions.length}</strong> lançamentos do sistema (receitas, despesas, transferências e recorrências).
          Contas, categorias, contatos e configurações são mantidos. Um backup é baixado automaticamente antes da exclusão.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder='Digite EXCLUIR para confirmar'
            className="flex-1 px-4 py-2 bg-transparent border border-rose-200 dark:border-rose-900 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 dark:text-slate-100 text-sm"
          />
          <button
            type="button"
            disabled={confirmText.trim().toUpperCase() !== 'EXCLUIR' || transactions.length === 0}
            onClick={() => { onDeleteAllTransactions(); setConfirmText(''); }}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} /> Excluir todos
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
