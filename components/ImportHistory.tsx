import React from 'react';
import { History, Undo2, FileText } from 'lucide-react';
import { Account, ImportRecord, Transaction } from '../types';
import { formatCurrency } from '../lib/utils';
import { formatDate } from '../lib/dates';

interface ImportHistoryProps {
  history: ImportRecord[];
  accounts: Account[];
  transactions: Transaction[];
  currency: string;
  onUndo: (id: string) => void;
}

/** Lista das importações de extrato, com opção de desfazer cada uma. */
const ImportHistory: React.FC<ImportHistoryProps> = ({ history, accounts, transactions, currency, onUndo }) => {
  const remainingByImport: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.importId) remainingByImport[t.importId] = (remainingByImport[t.importId] || 0) + 1;
  });

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <h3 className="font-bold mb-1 flex items-center gap-2 dark:text-slate-100">
        <History size={18} className="text-slate-400" />
        Histórico de Importações
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Cada extrato importado fica registrado aqui. "Desfazer" apaga apenas os lançamentos criados por aquela importação.
      </p>

      {history.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          Nenhum extrato importado ainda.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-2 py-2">Importado em</th>
                <th className="px-2 py-2">Arquivo / Conta</th>
                <th className="px-2 py-2">Período do extrato</th>
                <th className="px-2 py-2 text-right">Lançamentos</th>
                <th className="px-2 py-2 text-right">Entradas / Saídas</th>
                <th className="px-2 py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map(r => {
                const acc = accounts.find(a => a.id === r.accountId);
                const remaining = remainingByImport[r.id] || 0;
                const undone = !!r.undoneAt;
                return (
                  <tr key={r.id} className={undone ? 'opacity-50' : ''}>
                    <td className="px-2 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {new Date(r.importedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-2 py-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <FileText size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[220px]" title={r.fileName}>{r.fileName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{acc?.name || 'Conta removida'}</div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {r.periodStart ? `${formatDate(r.periodStart)} a ${formatDate(r.periodEnd)}` : '—'}
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{r.count}</div>
                      {r.duplicates > 0 && <div className="text-[11px] text-slate-400">{r.duplicates} repetidos ignorados</div>}
                      {!undone && remaining < r.count && <div className="text-[11px] text-amber-600">{remaining} ainda no sistema</div>}
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap text-xs">
                      <div className="text-emerald-600 dark:text-emerald-400 font-semibold">+ {formatCurrency(r.totalIncome, currency)}</div>
                      <div className="text-rose-600 dark:text-rose-400 font-semibold">- {formatCurrency(r.totalExpense, currency)}</div>
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap">
                      {undone ? (
                        <span className="text-[11px] font-bold text-slate-400 uppercase">
                          Desfeita em {new Date(r.undoneAt!).toLocaleDateString('pt-BR')}
                        </span>
                      ) : remaining === 0 ? (
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Sem lançamentos</span>
                      ) : (
                        <button onClick={() => onUndo(r.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 rounded-lg transition-colors">
                          <Undo2 size={14} /> Desfazer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ImportHistory;
