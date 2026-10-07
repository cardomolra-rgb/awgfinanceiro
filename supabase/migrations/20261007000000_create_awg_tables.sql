-- Migração do banco de dados para o AwgFinanceiro
-- Tabelas iniciadas com o prefixo awg_ para isolamento de schema no projeto Supabase compartilhado.

-- 1. Categorias
CREATE TABLE IF NOT EXISTS public.awg_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'INCOME', 'EXPENSE', 'TRANSFER', 'BOTH'
  color TEXT NOT NULL,
  icon TEXT,
  dre_group TEXT, -- 'REVENUE', 'TAXES', 'OPERATIVE', 'ADMIN', 'MARKETING', 'OTHER', 'EXCLUDED'
  parent_id TEXT REFERENCES public.awg_categories(id) ON DELETE SET NULL,
  cost_centers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contas Bancárias / Caixas / Cartões
CREATE TABLE IF NOT EXISTS public.awg_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'CASH', 'BANK', 'CREDIT_CARD'
  initial_balance NUMERIC DEFAULT 0 NOT NULL,
  balance NUMERIC,
  credit_limit NUMERIC,
  closing_day INTEGER,
  due_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Contatos (Clientes, Fornecedores, Colaboradores)
CREATE TABLE IF NOT EXISTS public.awg_entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'CLIENT', 'SUPPLIER', 'BOTH', 'EMPLOYEE'
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Lançamentos Financeiros
CREATE TABLE IF NOT EXISTS public.awg_transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'INCOME', 'EXPENSE', 'TRANSFER'
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  accrual_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  payment_date TEXT,
  category_id TEXT REFERENCES public.awg_categories(id) ON DELETE SET NULL,
  account_id TEXT REFERENCES public.awg_accounts(id) ON DELETE CASCADE,
  destination_account_id TEXT REFERENCES public.awg_accounts(id) ON DELETE SET NULL,
  entity_id TEXT REFERENCES public.awg_entities(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL, -- 'PIX', 'BOLETO', 'CASH', 'CREDIT_CARD', 'TRANSFER'
  status TEXT NOT NULL, -- 'PLANNED', 'PAID', 'OVERDUE'
  observations TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  installments_count INTEGER,
  current_installment INTEGER,
  cost_center TEXT,
  recurrence_period TEXT,
  recurrence_id TEXT,
  import_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Regras de Recorrência
CREATE TABLE IF NOT EXISTS public.awg_recurrences (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL, -- 'MONTHLY', 'WEEKLY', 'YEARLY'
  start_date TEXT NOT NULL,
  generated_count INTEGER DEFAULT 0 NOT NULL,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  template JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Configurações da Empresa
CREATE TABLE IF NOT EXISTS public.awg_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT DEFAULT 'AWG Financeiro',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#1e40af',
  accent_color TEXT DEFAULT '#f59e0b',
  currency TEXT DEFAULT 'BRL',
  footer_text TEXT,
  theme TEXT DEFAULT 'dark',
  last_backup_at TIMESTAMPTZ,
  cost_centers JSONB DEFAULT '[]'::jsonb,
  categories_seed_version INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Histórico de Importações
CREATE TABLE IF NOT EXISTS public.awg_import_history (
  id TEXT PRIMARY KEY,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  file_name TEXT NOT NULL,
  account_id TEXT REFERENCES public.awg_accounts(id) ON DELETE SET NULL,
  count INTEGER DEFAULT 0,
  duplicates INTEGER DEFAULT 0,
  total_income NUMERIC DEFAULT 0,
  total_expense NUMERIC DEFAULT 0,
  period_start TEXT,
  period_end TEXT,
  undone_at TIMESTAMPTZ,
  removed_count INTEGER
);

-- Configuração de Row Level Security (RLS) e Políticas de Acesso
ALTER TABLE public.awg_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awg_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awg_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awg_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awg_recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awg_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awg_import_history ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso público/autenticado (leitura e escrita nas tabelas awg_)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso total awg_categories') THEN
        CREATE POLICY "Permitir acesso total awg_categories" ON public.awg_categories FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso total awg_accounts') THEN
        CREATE POLICY "Permitir acesso total awg_accounts" ON public.awg_accounts FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso total awg_entities') THEN
        CREATE POLICY "Permitir acesso total awg_entities" ON public.awg_entities FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso total awg_transactions') THEN
        CREATE POLICY "Permitir acesso total awg_transactions" ON public.awg_transactions FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso total awg_recurrences') THEN
        CREATE POLICY "Permitir acesso total awg_recurrences" ON public.awg_recurrences FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso total awg_settings') THEN
        CREATE POLICY "Permitir acesso total awg_settings" ON public.awg_settings FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso total awg_import_history') THEN
        CREATE POLICY "Permitir acesso total awg_import_history" ON public.awg_import_history FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
