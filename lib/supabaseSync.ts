import { supabase } from './supabase';
import { AppState, Category, Account, Entity, Transaction, RecurrenceRule, CompanySettings, ImportRecord } from '../types';

export interface SyncStatus {
  connected: boolean;
  tablesExist: boolean;
  message: string;
  lastSyncAt?: string;
}

/** Verifica se a conexão com o Supabase e as tabelas awg_ estão disponíveis. */
export async function checkSupabaseConnection(): Promise<SyncStatus> {
  try {
    const { data, error } = await supabase.from('awg_categories').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        return {
          connected: true,
          tablesExist: false,
          message: 'As tabelas awg_ ainda não foram criadas no Supabase SQL Editor.',
        };
      }
      return {
        connected: false,
        tablesExist: false,
        message: `Erro na conexão Supabase: ${error.message}`,
      };
    }
    return {
      connected: true,
      tablesExist: true,
      message: 'Conectado e tabelas awg_ prontas no Supabase.',
    };
  } catch (e: any) {
    return {
      connected: false,
      tablesExist: false,
      message: `Erro de conexão: ${e.message || String(e)}`,
    };
  }
}

/** Carrega todos os dados do Supabase e retorna no formato AppState. */
export async function loadFromSupabase(): Promise<AppState | null> {
  try {
    const [
      resCategories,
      resAccounts,
      resEntities,
      resTransactions,
      resRecurrences,
      resSettings,
      resImportHistory,
    ] = await Promise.all([
      supabase.from('awg_categories').select('*'),
      supabase.from('awg_accounts').select('*'),
      supabase.from('awg_entities').select('*'),
      supabase.from('awg_transactions').select('*'),
      supabase.from('awg_recurrences').select('*'),
      supabase.from('awg_settings').select('*').eq('id', 'default').single(),
      supabase.from('awg_import_history').select('*'),
    ]);

    if (resCategories.error || resAccounts.error || resEntities.error || resTransactions.error) {
      console.warn('Falha ao carregar do Supabase:', resCategories.error || resAccounts.error || resEntities.error || resTransactions.error);
      return null;
    }

    const categories: Category[] = (resCategories.data || []).map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      color: c.color,
      icon: c.icon || undefined,
      dreGroup: c.dre_group || undefined,
      parentId: c.parent_id || undefined,
      costCenters: Array.isArray(c.cost_centers) ? c.cost_centers : [],
    }));

    const accounts: Account[] = (resAccounts.data || []).map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      initialBalance: Number(a.initial_balance) || 0,
      balance: a.balance !== null ? Number(a.balance) : undefined,
      creditLimit: a.credit_limit !== null ? Number(a.credit_limit) : undefined,
      closingDay: a.closing_day || undefined,
      dueDay: a.due_day || undefined,
    }));

    const entities: Entity[] = (resEntities.data || []).map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      email: e.email || undefined,
      phone: e.phone || undefined,
    }));

    const transactions: Transaction[] = (resTransactions.data || []).map(t => ({
      id: t.id,
      type: t.type,
      description: t.description,
      amount: Number(t.amount) || 0,
      accrualDate: t.accrual_date,
      dueDate: t.due_date,
      paymentDate: t.payment_date || undefined,
      categoryId: t.category_id,
      accountId: t.account_id,
      destinationAccountId: t.destination_account_id || undefined,
      entityId: t.entity_id || undefined,
      paymentMethod: t.payment_method,
      status: t.status,
      observations: t.observations || undefined,
      isRecurring: Boolean(t.is_recurring),
      installmentsCount: t.installments_count || undefined,
      currentInstallment: t.current_installment || undefined,
      costCenter: t.cost_center || undefined,
      recurrencePeriod: t.recurrence_period || undefined,
      recurrenceId: t.recurrence_id || undefined,
      importId: t.import_id || undefined,
      createdAt: t.created_at,
    }));

    const recurrences: RecurrenceRule[] = (resRecurrences.data || []).map(r => ({
      id: r.id,
      period: r.period,
      startDate: r.start_date,
      generatedCount: r.generated_count || 0,
      active: Boolean(r.active),
      template: r.template,
    }));

    const settingsData = resSettings.data;
    const settings: CompanySettings = {
      name: settingsData?.name || 'AWG Financeiro',
      logoUrl: settingsData?.logo_url || undefined,
      primaryColor: settingsData?.primary_color || '#3b82f6',
      secondaryColor: settingsData?.secondary_color || '#1e40af',
      accentColor: settingsData?.accent_color || '#f59e0b',
      currency: settingsData?.currency || 'BRL',
      footerText: settingsData?.footer_text || '',
      theme: (settingsData?.theme as 'light' | 'dark') || 'dark',
      lastBackupAt: settingsData?.last_backup_at || undefined,
    };

    const costCenters: string[] = Array.isArray(settingsData?.cost_centers) ? settingsData.cost_centers : [];
    const categoriesSeedVersion: number = settingsData?.categories_seed_version || 0;

    const importHistory: ImportRecord[] = (resImportHistory.data || []).map(h => ({
      id: h.id,
      importedAt: h.imported_at,
      fileName: h.file_name,
      accountId: h.account_id,
      count: h.count || 0,
      duplicates: h.duplicates || 0,
      totalIncome: Number(h.total_income) || 0,
      totalExpense: Number(h.total_expense) || 0,
      periodStart: h.period_start || undefined,
      periodEnd: h.period_end || undefined,
      undoneAt: h.undone_at || undefined,
      removedCount: h.removed_count !== null ? Number(h.removed_count) : undefined,
    }));

    return {
      categories,
      accounts,
      entities,
      transactions,
      recurrences,
      settings,
      costCenters,
      categoriesSeedVersion,
      importHistory,
    };
  } catch (err) {
    console.error('Erro ao carregar dados do Supabase:', err);
    return null;
  }
}

/** Envia todos os dados do AppState atual para o Supabase (Subir para o Supabase). */
export async function pushAllToSupabase(state: AppState): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Categorias
    if (state.categories.length > 0) {
      const rows = state.categories.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        color: c.color,
        icon: c.icon || null,
        dre_group: c.dreGroup || null,
        parent_id: c.parentId || null,
        cost_centers: c.costCenters || [],
      }));
      const { error } = await supabase.from('awg_categories').upsert(rows);
      if (error) throw new Error(`Falha ao salvar categorias: ${error.message}`);
    }

    // 2. Contas
    if (state.accounts.length > 0) {
      const rows = state.accounts.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        initial_balance: a.initialBalance,
        balance: a.balance ?? null,
        credit_limit: a.creditLimit ?? null,
        closing_day: a.closingDay ?? null,
        due_day: a.dueDay ?? null,
      }));
      const { error } = await supabase.from('awg_accounts').upsert(rows);
      if (error) throw new Error(`Falha ao salvar contas: ${error.message}`);
    }

    // 3. Contatos
    if (state.entities.length > 0) {
      const rows = state.entities.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        email: e.email || null,
        phone: e.phone || null,
      }));
      const { error } = await supabase.from('awg_entities').upsert(rows);
      if (error) throw new Error(`Falha ao salvar contatos: ${error.message}`);
    }

    // 4. Lançamentos
    if (state.transactions.length > 0) {
      const rows = state.transactions.map(t => ({
        id: t.id,
        type: t.type,
        description: t.description,
        amount: t.amount,
        accrual_date: t.accrualDate,
        due_date: t.dueDate,
        payment_date: t.paymentDate || null,
        category_id: t.categoryId || null,
        account_id: t.accountId || null,
        destination_account_id: t.destinationAccountId || null,
        entity_id: t.entityId || null,
        payment_method: t.paymentMethod,
        status: t.status,
        observations: t.observations || null,
        is_recurring: Boolean(t.isRecurring),
        installments_count: t.installmentsCount || null,
        current_installment: t.currentInstallment || null,
        cost_center: t.costCenter || null,
        recurrence_period: t.recurrencePeriod || null,
        recurrence_id: t.recurrenceId || null,
        import_id: t.importId || null,
        created_at: t.createdAt || new Date().toISOString(),
      }));
      const { error } = await supabase.from('awg_transactions').upsert(rows);
      if (error) throw new Error(`Falha ao salvar lançamentos: ${error.message}`);
    }

    // 5. Recorrências
    if (state.recurrences.length > 0) {
      const rows = state.recurrences.map(r => ({
        id: r.id,
        period: r.period,
        start_date: r.startDate,
        generated_count: r.generatedCount,
        active: r.active,
        template: r.template,
      }));
      const { error } = await supabase.from('awg_recurrences').upsert(rows);
      if (error) throw new Error(`Falha ao salvar regras de recorrência: ${error.message}`);
    }

    // 6. Configurações
    const settingsRow = {
      id: 'default',
      name: state.settings.name,
      logo_url: state.settings.logoUrl || null,
      primary_color: state.settings.primaryColor,
      secondary_color: state.settings.secondaryColor,
      accent_color: state.settings.accentColor,
      currency: state.settings.currency,
      footer_text: state.settings.footerText,
      theme: state.settings.theme,
      last_backup_at: state.settings.lastBackupAt || null,
      cost_centers: state.costCenters || [],
      categories_seed_version: state.categoriesSeedVersion || 0,
      updated_at: new Date().toISOString(),
    };
    const { error: settingsError } = await supabase.from('awg_settings').upsert(settingsRow);
    if (settingsError) throw new Error(`Falha ao salvar configurações: ${settingsError.message}`);

    // 7. Histórico de Importações
    if (state.importHistory.length > 0) {
      const rows = state.importHistory.map(h => ({
        id: h.id,
        imported_at: h.importedAt,
        file_name: h.fileName,
        account_id: h.accountId || null,
        count: h.count,
        duplicates: h.duplicates,
        total_income: h.totalIncome,
        total_expense: h.totalExpense,
        period_start: h.periodStart || null,
        period_end: h.periodEnd || null,
        undone_at: h.undoneAt || null,
        removed_count: h.removedCount ?? null,
      }));
      const { error } = await supabase.from('awg_import_history').upsert(rows);
      if (error) throw new Error(`Falha ao salvar histórico de importações: ${error.message}`);
    }

    return { success: true, message: 'Projeto e dados enviados para o Supabase com sucesso!' };
  } catch (err: any) {
    console.error('Erro no pushAllToSupabase:', err);
    return { success: false, message: err.message || String(err) };
  }
}
