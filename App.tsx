import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Accounts from './components/Accounts';
import Categories from './components/Categories';
import Entities from './components/Entities';
import Reports from './components/Reports';
import Settings from './components/Settings';
import AccountsPayable from './components/AccountsPayable';
import AccountsReceivable from './components/AccountsReceivable';
import TransactionModal from './components/TransactionModal';
import ImportModal from './components/ImportModal';
import AuthModal from './components/AuthModal';
import { useFinanceStore } from './store/useFinanceStore';
import { Transaction, TransactionType, TransactionStatus } from './types';
import { todayISO } from './lib/dates';
import { UNCLASSIFIED_CATEGORY_ID } from './constants';
import { supabase } from './lib/supabase';
import { signOutUser } from './lib/auth';
import { User } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [newTransactionType, setNewTransactionType] = useState<TransactionType | undefined>();

  const store = useFinanceStore();
  const {
    transactions, categories, accounts, entities, settings, costCenters, recurrences, saveError,
    supabaseStatus, syncToSupabase, refreshSupabaseStatus,
    addTransaction, addMultipleTransactions, updateTransaction, deleteTransaction,
    addAccount, updateAccount, deleteAccount,
    addCategory, updateCategory, deleteCategory,
    addEntity, updateEntity, deleteEntity,
    updateSettings, toggleTheme, exportData, importData, importTransactionsBatch, markBackupDone,
    undoImport, deleteAllTransactions, importHistory,
  } = store;

  // Gerenciamento de Sessão e Listener de Autenticação Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        refreshSupabaseStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshSupabaseStatus]);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUser(null);
    } catch (e) {
      console.error('Erro ao sair:', e);
    }
  };

  const handleOpenModal = (type?: TransactionType) => {
    setEditingTransaction(undefined);
    setNewTransactionType(type);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (t: Transaction) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = (data: any, installmentsCount?: number) => {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, data);
    } else if (installmentsCount && installmentsCount > 1) {
      addMultipleTransactions(data, installmentsCount);
    } else {
      addTransaction(data);
    }
    setIsModalOpen(false);
  };

  /** Exclusão com confirmação; em lançamentos recorrentes pergunta se deve encerrar a recorrência. */
  const handleDeleteTransaction = (id: string) => {
    const t = transactions.find(x => x.id === id);
    if (!t) return;
    if (!window.confirm(`Excluir o lançamento "${t.description}"?\nEssa ação não pode ser desfeita.`)) return;
    const rule = t.recurrenceId ? recurrences.find(r => r.id === t.recurrenceId && r.active) : undefined;
    const stop = rule
      ? window.confirm('Este lançamento é recorrente.\n\nOK = encerrar a recorrência (não gerar os próximos)\nCancelar = excluir só este')
      : false;
    deleteTransaction(id, stop);
  };

  const handleDeleteAccount = (id: string) => {
    const used = transactions.filter(t => t.accountId === id || t.destinationAccountId === id).length;
    if (used > 0) {
      alert(`Esta conta tem ${used} lançamento(s) vinculado(s) e não pode ser excluída.\nMova ou exclua os lançamentos antes.`);
      return;
    }
    if (accounts.length <= 1) {
      alert('É preciso manter pelo menos uma conta cadastrada.');
      return;
    }
    const acc = accounts.find(a => a.id === id);
    if (window.confirm(`Excluir a conta "${acc?.name}"?`)) deleteAccount(id);
  };

  const handleDeleteCategory = (id: string) => {
    const used = transactions.filter(t => t.categoryId === id).length;
    if (used > 0) {
      alert(`Esta categoria é usada em ${used} lançamento(s) e não pode ser excluída.\nAltere a categoria desses lançamentos antes.`);
      return;
    }
    if (categories.some(c => c.parentId === id)) {
      alert('Esta categoria possui subcategorias. Exclua ou mova as subcategorias antes.');
      return;
    }
    const cat = categories.find(c => c.id === id);
    if (window.confirm(`Excluir a categoria "${cat?.name}"?`)) deleteCategory(id);
  };

  const handleDeleteEntity = (id: string) => {
    const used = transactions.filter(t => t.entityId === id).length;
    if (used > 0) {
      alert(`Este contato está vinculado a ${used} lançamento(s) e não pode ser excluído.`);
      return;
    }
    const ent = entities.find(e => e.id === id);
    if (window.confirm(`Excluir o contato "${ent?.name}"?`)) deleteEntity(id);
  };

  /** Baixa rápida (botão ✓ nas listas). */
  const handleMarkPaid = (id: string) => {
    updateTransaction(id, { status: TransactionStatus.PAID, paymentDate: todayISO() });
  };

  /** Desfaz uma importação de extrato, mostrando antes o que será apagado. */
  const handleUndoImport = (importId: string) => {
    const rec = importHistory.find(r => r.id === importId);
    const txs = transactions.filter(t => t.importId === importId);
    if (!rec || txs.length === 0) return;
    const classified = txs.filter(t => t.categoryId !== UNCLASSIFIED_CATEGORY_ID).length;
    const msg = `Desfazer a importação de "${rec.fileName}"?\n\n`
      + `Serão excluídos ${txs.length} lançamento(s) criados por ela.`
      + (classified > 0 ? `\nAtenção: ${classified} deles já foram classificados ou editados e também serão excluídos.` : '')
      + `\n\nEssa ação não pode ser desfeita.`;
    if (window.confirm(msg)) undoImport(importId);
  };

  /** Exclui todos os lançamentos, baixando um backup antes. */
  const handleDeleteAllTransactions = () => {
    if (!window.confirm(`Excluir TODOS os ${transactions.length} lançamentos?\n\nUm backup será baixado agora. Para recuperar, use Configurações → Importar Arquivo com esse backup.`)) return;
    handleExport();
    deleteAllTransactions();
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_awgfinanceiro_${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    markBackupDone();
  };

  // Lembrete: sem backup há mais de 7 dias (ou nunca feito) e já existem lançamentos
  const BACKUP_REMINDER_DAYS = 7;
  const daysSinceBackup = settings.lastBackupAt
    ? Math.floor((Date.now() - new Date(settings.lastBackupAt).getTime()) / 86400000)
    : null;
  const needsBackup = transactions.length > 0 && (daysSinceBackup === null || daysSinceBackup >= BACKUP_REMINDER_DAYS);

  const listProps = {
    transactions, categories, accounts, entities, settings,
    onDelete: handleDeleteTransaction,
    onUpdate: updateTransaction,
    onMarkPaid: handleMarkPaid,
    onEdit: handleEditTransaction,
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onNewTransaction={handleOpenModal}
      toggleTheme={toggleTheme}
      settings={settings}
      transactions={transactions}
      categories={categories}
      accounts={accounts}
      entities={entities}
      onEditTransaction={handleEditTransaction}
      onBackup={handleExport}
      lastBackupAt={settings.lastBackupAt}
      needsBackup={needsBackup}
      user={user}
      onOpenAuth={() => setIsAuthModalOpen(true)}
      onSignOut={handleSignOut}
    >
      {needsBackup && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm font-semibold">
            {daysSinceBackup === null
              ? 'Você ainda não fez nenhum backup. Os dados ficam só neste navegador e podem ser perdidos se o histórico for limpo.'
              : `Seu último backup foi há ${daysSinceBackup} dias. Faça um novo para não perder os lançamentos recentes.`}
          </div>
          <button onClick={handleExport} className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors">
            Fazer backup agora
          </button>
        </div>
      )}
      {saveError && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300">
          {saveError}
        </div>
      )}

      {activeTab === 'dashboard' && (
        <Dashboard transactions={transactions} categories={categories} accounts={accounts} settings={settings} />
      )}

      {activeTab === 'transactions' && <Transactions {...listProps} />}

      {activeTab === 'accounts' && (
        <Accounts accounts={accounts} onAdd={addAccount} onUpdate={updateAccount} onDelete={handleDeleteAccount} settings={settings} />
      )}

      {activeTab === 'payable' && <AccountsPayable {...listProps} />}

      {activeTab === 'receivable' && <AccountsReceivable {...listProps} />}

      {activeTab === 'categories' && (
        <Categories categories={categories} costCenters={costCenters} onAdd={addCategory} onUpdate={updateCategory} onDelete={handleDeleteCategory} />
      )}

      {activeTab === 'entities' && (
        <Entities entities={entities} onAdd={addEntity} onUpdate={updateEntity} onDelete={handleDeleteEntity} />
      )}

      {activeTab === 'reports' && (
        <Reports transactions={transactions} categories={categories} accounts={accounts} settings={settings} />
      )}

      {activeTab === 'settings' && (
        <Settings
          settings={settings}
          onUpdate={updateSettings}
          onExport={handleExport}
          lastBackupAt={settings.lastBackupAt}
          onImport={() => setIsImportModalOpen(true)}
          importHistory={importHistory}
          accounts={accounts}
          transactions={transactions}
          onUndoImport={handleUndoImport}
          onDeleteAllTransactions={handleDeleteAllTransactions}
          supabaseStatus={supabaseStatus}
          onSyncToSupabase={syncToSupabase}
          onRefreshSupabaseStatus={refreshSupabaseStatus}
        />
      )}

      {isModalOpen && (
        <TransactionModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTransaction}
          categories={categories}
          accounts={accounts}
          entities={entities}
          costCenters={costCenters}
          initialData={editingTransaction}
          initialType={newTransactionType}
        />
      )}

      {isImportModalOpen && (
        <ImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportBackup={(json: string) => {
            if (transactions.length > 0) handleExport();
            return importData(json);
          }}
          onImportTransactions={importTransactionsBatch}
          accounts={accounts}
          categories={categories}
          existingTransactions={transactions}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          refreshSupabaseStatus();
        }}
      />
    </Layout>
  );
};

export default App;
