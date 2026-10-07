import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Transaction, Category, Account, Entity, CompanySettings, AppState, TransactionStatus, TransactionType, ImportRecord } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, DEFAULT_SETTINGS, MOCK_TRANSACTIONS, DEFAULT_COST_CENTRES } from '../constants';
import {
  applyRecurrences, computeAccountBalance, createRuleFrom, generateId, normalizeState, round2, splitInstallments,
} from '../lib/finance';
import { addMonths, normalizeISODate } from '../lib/dates';
import { checkSupabaseConnection, loadFromSupabase, pushAllToSupabase, SyncStatus } from '../lib/supabaseSync';

const STORAGE_KEY = 'finance_pro_data_v4';

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;

const loadInitialState = (): AppState => {
  let base: AppState;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    base = stored
      ? normalizeState(JSON.parse(stored))
      : normalizeState({
          transactions: MOCK_TRANSACTIONS,
          categories: DEFAULT_CATEGORIES,
          accounts: DEFAULT_ACCOUNTS,
          entities: [],
          settings: DEFAULT_SETTINGS,
          costCenters: DEFAULT_COST_CENTRES,
          recurrences: [],
          importHistory: [],
        });
  } catch (e) {
    console.error('Falha ao ler dados salvos', e);
    base = normalizeState({});
  }
  return applyRecurrences(base);
};

/** Limpa campos que não fazem sentido para o tipo/status do lançamento. */
const sanitize = <T extends Partial<Transaction>>(t: T): T => {
  const out: any = { ...t };
  if (out.amount !== undefined) out.amount = round2(Number(out.amount) || 0);
  if (out.accrualDate) out.accrualDate = normalizeISODate(out.accrualDate);
  if (out.dueDate) out.dueDate = normalizeISODate(out.dueDate);
  if (out.status !== undefined) {
    if (out.status === TransactionStatus.PAID) {
      out.paymentDate = normalizeISODate(out.paymentDate) || out.dueDate || out.accrualDate;
    } else {
      out.paymentDate = undefined;
    }
  }
  if (out.type && out.type !== TransactionType.TRANSFER) out.destinationAccountId = undefined;
  if (out.type === TransactionType.TRANSFER) out.entityId = undefined;
  if (out.entityId === '') out.entityId = undefined;
  return out;
};

export function useFinanceStore() {
  const [state, setState] = useState<AppState>(loadInitialState);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<SyncStatus & { syncing: boolean }>({
    connected: false,
    tablesExist: false,
    message: 'Verificando Supabase...',
    syncing: false,
  });
  const warnedRef = useRef(false);
  const isInitialMount = useRef(true);

  // Checa conexão Supabase e sincroniza dados iniciais
  const refreshSupabaseStatus = useCallback(async () => {
    setSupabaseStatus(prev => ({ ...prev, syncing: true }));
    const status = await checkSupabaseConnection();
    if (status.tablesExist) {
      const remoteData = await loadFromSupabase();
      if (remoteData && (remoteData.transactions.length > 0 || remoteData.categories.length > 0)) {
        setState(applyRecurrences(normalizeState(remoteData)));
        setSupabaseStatus({ ...status, syncing: false, message: 'Dados sincronizados com o Supabase com sucesso.' });
      } else {
        // Se as tabelas no Supabase estão vazias, envia o estado local atual para popular o banco remoto
        const pushRes = await pushAllToSupabase(state);
        setSupabaseStatus({ ...status, syncing: false, message: pushRes.message });
      }
    } else {
      setSupabaseStatus({ ...status, syncing: false });
    }
  }, [state]);

  useEffect(() => {
    refreshSupabaseStatus();
  }, []);

  const syncToSupabase = async () => {
    setSupabaseStatus(prev => ({ ...prev, syncing: true }));
    const res = await pushAllToSupabase(state);
    const conn = await checkSupabaseConnection();
    setSupabaseStatus({
      ...conn,
      syncing: false,
      message: res.message,
      lastSyncAt: new Date().toLocaleTimeString(),
    });
    return res;
  };

  // Auto-sync no Supabase em segundo plano ao alterar dados
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (supabaseStatus.tablesExist && !supabaseStatus.syncing) {
      const timer = setTimeout(() => {
        pushAllToSupabase(state).catch(err => console.error('Erro no auto-sync Supabase:', err));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state, supabaseStatus.tablesExist]);

  // Várias abas abertas: quando outra aba salva, esta aba recarrega os dados.
  // Sem isso, a aba desatualizada sobrescreveria (apagaria) o que foi feito na outra.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      try {
        setState(normalizeState(JSON.parse(e.newValue)));
      } catch (err) {
        console.error('Dados de outra aba inválidos; mantendo os desta aba.', err);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    try {
      const serialized = JSON.stringify(state);
      // Só grava se mudou (evita "eco" infinito entre abas)
      if (localStorage.getItem(STORAGE_KEY) !== serialized) localStorage.setItem(STORAGE_KEY, serialized);
      setSaveError(null);
      warnedRef.current = false;
    } catch (e) {
      console.error('Falha ao salvar dados', e);
      const msg = 'Não foi possível salvar os dados no navegador (espaço cheio). Baixe um backup em Configurações e remova o logo ou dados antigos.';
      setSaveError(msg);
      if (!warnedRef.current) {
        warnedRef.current = true;
        alert(msg);
      }
    }
    if (state.settings?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state]);

  const accountsWithBalances = useMemo(
    () => state.accounts.map(acc => ({ ...acc, balance: computeAccountBalance(acc.id, acc.initialBalance, state.transactions) })),
    [state.accounts, state.transactions]
  );

  // ---------------- Lançamentos ----------------

  const addTransaction = (t: NewTransaction) => {
    setState(prev => {
      const tx: Transaction = { ...sanitize(t), id: generateId(), createdAt: new Date().toISOString() } as Transaction;
      let next: AppState = { ...prev, transactions: [...prev.transactions, tx] };
      if (tx.isRecurring && tx.type !== TransactionType.TRANSFER) {
        const rule = createRuleFrom(tx);
        tx.recurrenceId = rule.id;
        next = applyRecurrences({ ...next, recurrences: [...prev.recurrences, rule] });
      } else {
        tx.isRecurring = false;
      }
      return next;
    });
  };

  /** Parcelamento: divide o valor sem perder centavos e mantém o dia do vencimento. */
  const addMultipleTransactions = (base: NewTransaction, installmentsCount: number) => {
    if (installmentsCount <= 1) {
      addTransaction(base);
      return;
    }
    const clean = sanitize(base);
    const firstDue = clean.dueDate || clean.accrualDate;
    const firstAccrual = clean.accrualDate || firstDue;
    const values = splitInstallments(clean.amount, installmentsCount);

    const items: Transaction[] = values.map((amount, idx) => {
      const i = idx + 1;
      const isFirst = idx === 0;
      // Só a 1ª parcela herda o status "pago"; as demais ficam em aberto.
      const status = isFirst ? clean.status : TransactionStatus.PLANNED;
      return {
        ...clean,
        id: generateId(),
        description: `${clean.description} (${i}/${installmentsCount})`,
        amount,
        dueDate: addMonths(firstDue, idx),
        accrualDate: addMonths(firstAccrual, idx),
        status,
        paymentDate: status === TransactionStatus.PAID ? clean.paymentDate : undefined,
        installmentsCount,
        currentInstallment: i,
        isRecurring: false,
        createdAt: new Date().toISOString(),
      };
    });

    setState(prev => ({ ...prev, transactions: [...prev.transactions, ...items] }));
  };

  /** Importa lançamentos de um extrato e registra a importação no histórico. */
  const importTransactionsBatch = (
    importedItems: NewTransaction[],
    meta: { fileName: string; accountId: string; duplicates: number },
  ) => {
    const now = new Date().toISOString();
    const importId = `imp-${generateId()}`;
    const newItems: Transaction[] = importedItems.map(item => ({
      ...sanitize(item),
      id: generateId(),
      importId,
      createdAt: now,
    }) as Transaction);
    const dates = newItems.map(t => t.accrualDate).sort();
    const sum = (type: TransactionType) => round2(newItems.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0));
    const record: ImportRecord = {
      id: importId,
      importedAt: now,
      fileName: meta.fileName,
      accountId: meta.accountId,
      count: newItems.length,
      duplicates: meta.duplicates,
      totalIncome: sum(TransactionType.INCOME),
      totalExpense: sum(TransactionType.EXPENSE),
      periodStart: dates[0],
      periodEnd: dates[dates.length - 1],
    };
    setState(prev => ({
      ...prev,
      transactions: [...prev.transactions, ...newItems],
      importHistory: [record, ...prev.importHistory],
    }));
  };

  /** Desfaz uma importação: apaga os lançamentos criados por ela (mesmo se já foram classificados). */
  const undoImport = (importId: string) => {
    setState(prev => {
      const removed = prev.transactions.filter(t => t.importId === importId).length;
      return {
        ...prev,
        transactions: prev.transactions.filter(t => t.importId !== importId),
        importHistory: prev.importHistory.map(r => r.id === importId
          ? { ...r, undoneAt: new Date().toISOString(), removedCount: removed } : r),
      };
    });
  };

  /** Apaga TODOS os lançamentos e recorrências. Mantém contas, categorias, contatos e configurações. */
  const deleteAllTransactions = () => {
    setState(prev => ({
      ...prev,
      transactions: [],
      recurrences: [],
      importHistory: prev.importHistory.map(r => r.undoneAt ? r : { ...r, undoneAt: new Date().toISOString(), removedCount: r.count }),
    }));
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setState(prev => {
      let recurrences = prev.recurrences;
      let createdRule = false;
      const transactions = prev.transactions.map(t => {
        if (t.id !== id) return t;
        const merged = sanitize({ ...t, ...updates }) as Transaction;

        // Desligou a recorrência → encerra a regra (as próximas não são mais geradas)
        if (t.recurrenceId && updates.isRecurring === false) {
          recurrences = recurrences.map(r => r.id === t.recurrenceId ? { ...r, active: false } : r);
        }
        // Ligou a recorrência em um lançamento comum → cria a regra
        if (!t.recurrenceId && merged.isRecurring && merged.type !== TransactionType.TRANSFER) {
          const rule = createRuleFrom(merged);
          merged.recurrenceId = rule.id;
          recurrences = [...recurrences, rule];
          createdRule = true;
        }
        // Mudou a frequência → atualiza a regra
        if (t.recurrenceId && merged.isRecurring && updates.recurrencePeriod && updates.recurrencePeriod !== t.recurrencePeriod) {
          recurrences = recurrences.map(r => r.id === t.recurrenceId ? { ...r, period: updates.recurrencePeriod! } : r);
        }
        return merged;
      });
      const next = { ...prev, transactions, recurrences };
      return createdRule ? applyRecurrences(next) : next;
    });
  };

  const deleteTransaction = (id: string, stopRecurrence = false) => {
    setState(prev => {
      const tx = prev.transactions.find(t => t.id === id);
      const recurrences = stopRecurrence && tx?.recurrenceId
        ? prev.recurrences.map(r => r.id === tx.recurrenceId ? { ...r, active: false } : r)
        : prev.recurrences;
      return { ...prev, recurrences, transactions: prev.transactions.filter(t => t.id !== id) };
    });
  };

  // ---------------- Contas ----------------

  const addAccount = (a: Omit<Account, 'id'>) => {
    setState(prev => ({ ...prev, accounts: [...prev.accounts, { ...a, id: generateId() }] }));
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.map(a => {
        if (a.id !== id) return a;
        const merged = { ...a, ...updates };
        if (merged.type !== 'CREDIT_CARD') {
          delete merged.creditLimit; delete merged.closingDay; delete merged.dueDay;
        }
        delete merged.balance; // saldo é sempre calculado
        return merged;
      })
    }));
  };

  const deleteAccount = (id: string) => {
    setState(prev => ({ ...prev, accounts: prev.accounts.filter(a => a.id !== id) }));
  };

  // ---------------- Categorias ----------------

  const addCategory = (c: Omit<Category, 'id'>) => {
    setState(prev => ({ ...prev, categories: [...prev.categories, { ...c, id: generateId() }] }));
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setState(prev => ({ ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, ...updates } : c) }));
  };

  const deleteCategory = (id: string) => {
    setState(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== id) }));
  };

  // ---------------- Contatos ----------------

  const addEntity = (e: Omit<Entity, 'id'>) => {
    setState(prev => ({ ...prev, entities: [...prev.entities, { ...e, id: generateId() }] }));
  };

  const updateEntity = (id: string, updates: Partial<Entity>) => {
    setState(prev => ({ ...prev, entities: prev.entities.map(e => e.id === id ? { ...e, ...updates } : e) }));
  };

  const deleteEntity = (id: string) => {
    setState(prev => ({ ...prev, entities: prev.entities.filter(e => e.id !== id) }));
  };

  // ---------------- Centros de custo ----------------

  const addCostCenter = (costCenter: string) => {
    const name = costCenter.trim();
    if (!name) return;
    setState(prev => prev.costCenters.includes(name) ? prev : { ...prev, costCenters: [...prev.costCenters, name] });
  };

  const deleteCostCenter = (costCenter: string) => {
    setState(prev => ({ ...prev, costCenters: prev.costCenters.filter(c => c !== costCenter) }));
  };

  // ---------------- Configurações ----------------

  const updateSettings = (settings: CompanySettings) => {
    // Mantém o tema atual (o formulário de configurações não controla o tema)
    setState(prev => ({ ...prev, settings: { ...settings, theme: prev.settings.theme, lastBackupAt: prev.settings.lastBackupAt } }));
  };

  /** Registra que um backup acabou de ser baixado. */
  const markBackupDone = () => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, lastBackupAt: new Date().toISOString() } }));
  };

  const toggleTheme = () => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, theme: prev.settings.theme === 'light' ? 'dark' : 'light' }
    }));
  };

  const importData = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed && Array.isArray(parsed.transactions) && Array.isArray(parsed.accounts)) {
        setState(applyRecurrences(normalizeState(parsed)));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Erro ao ler backup', e);
      return false;
    }
  };

  return {
    ...state,
    accounts: accountsWithBalances,
    loading: false,
    saveError,
    supabaseStatus,
    syncToSupabase,
    refreshSupabaseStatus,
    addTransaction, addMultipleTransactions, importTransactionsBatch, undoImport, deleteAllTransactions, updateTransaction, deleteTransaction,
    addAccount, updateAccount, deleteAccount,
    addCategory, updateCategory, deleteCategory,
    addEntity, updateEntity, deleteEntity,
    addCostCenter, deleteCostCenter,
    updateSettings,
    toggleTheme,
    markBackupDone,
    importData,
    exportData: () => JSON.stringify(state, null, 2)
  };
}
