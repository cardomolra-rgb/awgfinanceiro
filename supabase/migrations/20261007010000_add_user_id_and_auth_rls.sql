-- Migração para suporte a Usuários e Autenticação (Supabase Auth)

-- 1. Adicionar a coluna user_id em todas as tabelas awg_
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'awg_categories' AND column_name = 'user_id') THEN
    ALTER TABLE public.awg_categories ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'awg_accounts' AND column_name = 'user_id') THEN
    ALTER TABLE public.awg_accounts ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'awg_entities' AND column_name = 'user_id') THEN
    ALTER TABLE public.awg_entities ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'awg_transactions' AND column_name = 'user_id') THEN
    ALTER TABLE public.awg_transactions ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'awg_recurrences' AND column_name = 'user_id') THEN
    ALTER TABLE public.awg_recurrences ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'awg_settings' AND column_name = 'user_id') THEN
    ALTER TABLE public.awg_settings ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'awg_import_history' AND column_name = 'user_id') THEN
    ALTER TABLE public.awg_import_history ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
  END IF;
END $$;

-- 2. Atualizar Políticas de Row Level Security (RLS) para isolar dados por usuário
-- Permitir acesso se o usuário for dono do dado OU se o dado for público (user_id IS NULL)

DROP POLICY IF EXISTS "Permitir acesso total awg_categories" ON public.awg_categories;
DROP POLICY IF EXISTS "Permitir acesso total awg_accounts" ON public.awg_accounts;
DROP POLICY IF EXISTS "Permitir acesso total awg_entities" ON public.awg_entities;
DROP POLICY IF EXISTS "Permitir acesso total awg_transactions" ON public.awg_transactions;
DROP POLICY IF EXISTS "Permitir acesso total awg_recurrences" ON public.awg_recurrences;
DROP POLICY IF EXISTS "Permitir acesso total awg_settings" ON public.awg_settings;
DROP POLICY IF EXISTS "Permitir acesso total awg_import_history" ON public.awg_import_history;

-- Políticas de Isolamento por Usuário
CREATE POLICY "Isolamento por usuario awg_categories" ON public.awg_categories
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Isolamento por usuario awg_accounts" ON public.awg_accounts
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Isolamento por usuario awg_entities" ON public.awg_entities
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Isolamento por usuario awg_transactions" ON public.awg_transactions
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Isolamento por usuario awg_recurrences" ON public.awg_recurrences
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Isolamento por usuario awg_settings" ON public.awg_settings
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Isolamento por usuario awg_import_history" ON public.awg_import_history
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
