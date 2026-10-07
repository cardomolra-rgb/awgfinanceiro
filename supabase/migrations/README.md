# Migrações do banco (AwgFinanceiro)

Cada alteração de estrutura do banco (criar tabela, coluna, regra de acesso) deve ficar registrada
aqui como um arquivo `.sql` numerado, por exemplo `20261007120000_login_e_dados.sql`.

Assim o histórico do banco fica junto com o código, e qualquer pessoa (ou agente via MCP)
sabe exatamente o que foi aplicado.

Regras:
- Toda tabela nova no schema `public` precisa de `alter table ... enable row level security;` e políticas.
- Nunca usar a chave `service_role` no frontend.
- Prefixar as tabelas deste sistema com `awg_` para não misturar com outros sistemas do mesmo projeto.
