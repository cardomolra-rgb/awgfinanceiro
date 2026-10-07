import { parseDate, toISODate, addMonths, formatDate, normalizeISODate } from '../lib/dates';
import { splitInstallments, applyRecurrences, createRuleFrom, normalizeState, computeAccountBalance, isOverdue } from '../lib/finance';
import { parseBRNumber, parseCSVRows, parseOFXRows } from '../components/ImportModal';
import { TransactionStatus, TransactionType, PaymentMethod } from '../types';

let fails = 0;
const eq = (name: string, a: any, b: any) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) fails++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${ok ? '' : `  -> got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`}`);
};

// Datas
eq('parseDate dia 1 continua dia 1', parseDate('2026-10-01').getDate(), 1);
eq('parseDate mês correto', parseDate('2026-10-01').getMonth(), 9);
eq('formatDate', formatDate('2026-10-03'), '03/10/2026');
eq('addMonths 31/01 +1 = 28/02', addMonths('2026-01-31', 1), '2026-02-28');
eq('addMonths 31/01 +2 = 31/03', addMonths('2026-01-31', 2), '2026-03-31');
eq('addMonths 15/12 +1 = 15/01', addMonths('2026-12-15', 1), '2027-01-15');
eq('normalize ISO com horário', normalizeISODate('2026-10-03T12:00:00.000Z'), '2026-10-03');

// Vencendo hoje não é atraso
const todayIso = toISODate(new Date());
eq('vence hoje não é atraso', isOverdue({ status: TransactionStatus.PLANNED, dueDate: todayIso, accrualDate: todayIso } as any), false);
eq('venceu ontem é atraso', isOverdue({ status: TransactionStatus.PLANNED, dueDate: addMonths(todayIso, -1), accrualDate: todayIso } as any), true);

// Parcelas
const p = splitInstallments(100, 3);
eq('100 em 3x', p, [33.33, 33.33, 33.34]);
eq('soma parcelas', Math.round(p.reduce((a, b) => a + b, 0) * 100) / 100, 100);
eq('1000 em 7x soma', Math.round(splitInstallments(1000, 7).reduce((a, b) => a + b, 0) * 100) / 100, 1000);

// Números BR
eq('1.234,56', parseBRNumber('1.234,56'), 1234.56);
eq('-1.234,56', parseBRNumber('-1.234,56'), -1234.56);
eq('R$ 50,00', parseBRNumber('R$ 50,00'), 50);
eq('(80,10)', parseBRNumber('(80,10)'), -80.1);
eq('120,00 D', parseBRNumber('120,00 D'), -120);
eq('1234.56', parseBRNumber('1234.56'), 1234.56);
eq('texto', parseBRNumber('PIX RECEBIDO'), null);

// CSV estilo extrato BR com cabeçalho, documento e saldo
const csv = `Data;Histórico;Documento;Valor;Saldo
01/10/2026;PIX RECEBIDO CLIENTE X;123456;1.500,00;10.000,00
02/10/2026;PAGAMENTO BOLETO FORNECEDOR;987654;-320,45;9.679,55
02/10/2026;PAGAMENTO BOLETO FORNECEDOR;987655;-320,45;9.359,10`;
const rows = parseCSVRows(csv);
eq('csv linhas', rows.length, 3);
eq('csv 1', rows[0], { date: '2026-10-01', amount: 1500, description: 'PIX RECEBIDO CLIENTE X' });
eq('csv 2', rows[1].amount, -320.45);

// CSV sem cabeçalho, vírgula
const csv2 = `2026-10-05,Venda balcão,250.00\n2026-10-06,"Compra, material",-99.9`;
const rows2 = parseCSVRows(csv2);
eq('csv2', rows2, [{ date: '2026-10-05', amount: 250, description: 'Venda balcão' }, { date: '2026-10-06', amount: -99.9, description: 'Compra, material' }]);

// OFX (SGML sem fechamento de tags)
const ofx = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261002120000[-3:BRT]
<TRNAMT>-45.90
<FITID>1
<MEMO>TARIFA BANCARIA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261003
<TRNAMT>1200.00
<NAME>PIX JOAO
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
eq('ofx', parseOFXRows(ofx), [
  { date: '2026-10-02', amount: -45.9, description: 'TARIFA BANCARIA' },
  { date: '2026-10-03', amount: 1200, description: 'PIX JOAO' },
]);

// Recorrência mensal iniciando hoje: gera próximas até ~45 dias
const base = {
  id: 'x', type: TransactionType.EXPENSE, description: 'Aluguel', amount: 2000, accrualDate: todayIso, dueDate: todayIso,
  categoryId: '4', accountId: 'a2', paymentMethod: PaymentMethod.BOLETO, status: TransactionStatus.PLANNED,
  isRecurring: true, recurrencePeriod: 'MONTHLY' as const, createdAt: new Date().toISOString(),
};
const rule = createRuleFrom(base as any);
let st = normalizeState({ transactions: [{ ...base, recurrenceId: rule.id }], accounts: [{ id: 'a2', name: 'B', type: 'BANK', initialBalance: 0 }], recurrences: [rule] });
st = applyRecurrences(st, todayIso);
const gen = st.transactions.filter(t => t.recurrenceId === rule.id);
eq('recorrência gera 1 ou 2 próximas', gen.length >= 2 && gen.length <= 3, true);
eq('recorrência 2ª = +1 mês', gen[1].dueDate, addMonths(todayIso, 1));
eq('aplicar de novo não duplica', applyRecurrences(st, todayIso).transactions.length, st.transactions.length);

// Regra antiga não recria meses passados
const old = { ...base, dueDate: '2025-01-10', accrualDate: '2025-01-10' };
const oldRule = createRuleFrom(old as any);
const st2 = applyRecurrences(normalizeState({ transactions: [old], accounts: [], recurrences: [oldRule] }), todayIso);
const gen2 = st2.transactions.filter(t => t.id !== 'x');
eq('regra antiga: nada antes de hoje', gen2.every(t => t.dueDate >= todayIso), true);

// Saldo com transferência
const txs: any[] = [
  { type: 'INCOME', amount: 100, accountId: 'a', status: 'PAID' },
  { type: 'EXPENSE', amount: 30, accountId: 'a', status: 'PAID' },
  { type: 'EXPENSE', amount: 999, accountId: 'a', status: 'PLANNED' },
  { type: 'TRANSFER', amount: 50, accountId: 'a', destinationAccountId: 'b', status: 'PAID' },
];
eq('saldo a', computeAccountBalance('a', 10, txs), 30);
eq('saldo b', computeAccountBalance('b', 0, txs), 50);

// Normalização: pago sem data de pagamento recebe vencimento; datas com horário viram data simples
const n = normalizeState({ transactions: [{ id: '1', type: 'EXPENSE', amount: '10.005', accrualDate: '2026-09-01', dueDate: '2026-09-05', status: 'PAID', paymentDate: '' }] });
eq('normalize paymentDate', n.transactions[0].paymentDate, '2026-09-05');
eq('normalize amount', n.transactions[0].amount, 10.01);

// Migração de categorias: dados antigos ganham as sugeridas sem perder as do usuário
import { DEFAULT_CATEGORIES } from '../constants';
const oldCats = [
  { id: '3', name: 'Salários e Encargos', type: 'EXPENSE', color: '#f00', dreGroup: 'ADMIN' },
  { id: 'x1', name: 'Energia Elétrica', type: 'EXPENSE', color: '#ff0', dreGroup: 'ADMIN' }, // já criada pelo usuário
  { id: 'x2', name: 'Minha Categoria', type: 'EXPENSE', color: '#0f0' },
];
const mig = normalizeState({ categories: oldCats, transactions: [] });
eq('migração mantém categoria do usuário', mig.categories.some(c => c.id === 'x2'), true);
eq('migração não duplica pelo nome', mig.categories.filter(c => c.name === 'Energia Elétrica').length, 1);
eq('migração adiciona sugeridas', mig.categories.length, DEFAULT_CATEGORIES.length + 1);
eq('padrão ganha centros de custo', mig.categories.find(c => c.id === '3')!.costCenters, ['Operacional', 'Administrativo']);
eq('segunda carga não muda', normalizeState(mig).categories.length, mig.categories.length);

// Histórico de importação reconstruído a partir de dados antigos
const ts = '2026-10-05T14:30:12.000Z';
const legacy = normalizeState({ transactions: [
  { id: 'l1', type: 'INCOME', amount: 100, accountId: 'a2', accrualDate: '2026-09-01', status: 'PAID', observations: 'Importado de extrato_set.ofx', createdAt: ts },
  { id: 'l2', type: 'EXPENSE', amount: 40, accountId: 'a2', accrualDate: '2026-09-20', status: 'PAID', observations: 'Importado de extrato_set.ofx', createdAt: ts },
  { id: 'l3', type: 'EXPENSE', amount: 10, accountId: 'a2', accrualDate: '2026-09-21', status: 'PAID', observations: 'Importado de outro.csv', createdAt: '2026-10-06T10:00:00.000Z' },
  { id: 'm1', type: 'EXPENSE', amount: 5, accountId: 'a2', accrualDate: '2026-09-21', status: 'PAID', createdAt: ts },
] });
eq('legado: 2 importações', legacy.importHistory.length, 2);
const setRec = legacy.importHistory.find(r => r.fileName === 'extrato_set.ofx')!;
eq('legado: totais', [setRec.count, setRec.totalIncome, setRec.totalExpense, setRec.periodStart, setRec.periodEnd], [2, 100, 40, '2026-09-01', '2026-09-20']);
eq('legado: lançamentos ligados', legacy.transactions.filter(t => t.importId === setRec.id).map(t => t.id), ['l1', 'l2']);
eq('legado: manual sem importId', legacy.transactions.find(t => t.id === 'm1')!.importId, undefined);
eq('legado: não reconstrói de novo', normalizeState(legacy).importHistory.length, 2);

// ---------------- Segurança / validação ----------------
import { neutralizeFormula, formatCurrency } from '../lib/utils';
eq('CSV: fórmula neutralizada', neutralizeFormula('=HYPERLINK("x")'), `'=HYPERLINK("x")`);
eq('CSV: @ neutralizado', neutralizeFormula('@SUM(A1)'), `'@SUM(A1)`);
eq('CSV: número negativo intacto', neutralizeFormula('-12,50'), '-12,50');
eq('CSV: texto normal intacto', neutralizeFormula('PIX JOAO'), 'PIX JOAO');
eq('moeda malformada não quebra', formatCurrency(10, 'R$$'), formatCurrency(10, 'BRL'));

const evil = normalizeState({
  transactions: [
    { id: 'ok1', type: 'EXPENSE', description: 12345, amount: '50', accountId: 'a1', categoryId: '3', accrualDate: '2026-10-01', status: 'PAID', paymentMethod: 'X', extra: 'lixo', __proto__: { polluted: true } },
    { id: 'bad', type: 'HACK', description: 'x', amount: 1 },
    null, 'texto', { id: 'ok1', type: 'INCOME', amount: 1, accrualDate: '2026-10-01' },
  ],
  accounts: [{ id: 'a1', name: null, type: 'BANK', initialBalance: 'abc' }, { name: 'sem id' }],
  categories: [{ id: '3', name: 'Salários', type: 'EXPENSE', color: 'red;background:url(https://evil)' }, { id: 'c2' }],
  entities: [{ id: 'e1', name: null }],
  settings: { name: 123, primaryColor: 'red;x', logoUrl: 'https://evil.example/t.png', currency: 'XYZ', theme: 'hack' },
});
eq('backup: descrição numérica vira texto', evil.transactions[0].description, '12345');
eq('backup: tipo inválido descartado + id repetido ignorado', evil.transactions.length, 1);
eq('backup: campos desconhecidos removidos', 'extra' in (evil.transactions[0] as any), false);
eq('backup: sem poluição de protótipo', ({} as any).polluted, undefined);
eq('backup: valor convertido', evil.transactions[0].amount, 50);
eq('backup: forma de pagamento inválida → PIX', evil.transactions[0].paymentMethod, 'PIX');
eq('backup: conta sem nome/saldo inválido', [evil.accounts.length, evil.accounts[0].name, evil.accounts[0].initialBalance], [1, 'Conta sem nome', 0]);
eq('backup: cor maliciosa trocada', evil.categories.find(c => c.id === '3')!.color, '#94a3b8');
eq('backup: categoria sem nome descartada', evil.categories.some(c => c.id === 'c2'), false);
eq('backup: logo externo bloqueado', evil.settings.logoUrl, undefined);
eq('backup: moeda/tema/cor validados', [evil.settings.currency, evil.settings.theme, evil.settings.primaryColor, evil.settings.name], ['BRL', 'light', '#F05523', '123']);
eq('backup: contato sem nome', evil.entities[0].name, 'Contato sem nome');
eq('lixo total não quebra', normalizeState('lixo').transactions.length >= 0, true);

console.log(fails ? `\n${fails} FALHA(S)` : '\nTodos os testes passaram');
process.exit(fails ? 1 : 0);
