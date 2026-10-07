import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileJson, FileSpreadsheet, AlertCircle, CheckCircle2, Landmark } from 'lucide-react';
import { Account, Category, Transaction, TransactionType, TransactionStatus, PaymentMethod } from '../types';
import { parseDate } from '../lib/dates';
import { UNCLASSIFIED_CATEGORY_ID } from '../constants';

interface ImportModalProps {
  onClose: () => void;
  onImportBackup: (jsonData: string) => boolean;
  onImportTransactions: (
    transactions: Omit<Transaction, 'id' | 'createdAt'>[],
    meta: { fileName: string; accountId: string; duplicates: number },
  ) => void;
  accounts: Account[];
  categories: Category[];
  existingTransactions: Transaction[];
}

interface ParsedRow {
  date: string;        // AAAA-MM-DD
  amount: number;      // com sinal: negativo = saída
  description: string;
}

/** Converte valores como "1.234,56", "-1234.56", "R$ 1.234,56", "(1.234,56)" ou "1.234,56 D". */
export const parseBRNumber = (raw: string): number | null => {
  if (!raw) return null;
  let s = raw.trim();
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  if (/\s*D$/i.test(s)) { negative = true; s = s.replace(/\s*D$/i, ''); }
  s = s.replace(/\s*C$/i, '');
  s = s.replace(/R\$\s?/i, '').replace(/\s/g, '');
  if (s.startsWith('-')) { negative = !negative; s = s.slice(1); }
  if (s.startsWith('+')) s = s.slice(1);
  if (!/^[\d.,]+$/.test(s)) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.');          // 1.234,56
  } else if (lastDot > lastComma && lastComma !== -1) {
    s = s.replace(/,/g, '');                               // 1,234.56
  } else if (lastDot !== -1 && lastComma === -1) {
    // Só pontos: "1.234" (milhar) ou "1234.56" (decimal)
    const parts = s.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negative ? -n : n;
};

const parseDateBR = (raw: string): string | null => {
  const s = raw.trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
};

/** Separa uma linha CSV respeitando aspas. */
const splitCSVLine = (line: string, sep: string): string[] => {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === sep && !quoted) {
      out.push(cur.trim()); cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
};

const MONEY_LIKE = /[.,]\d{2}\)?(\s*[DC])?$/i;

export const parseCSVRows = (text: string): ParsedRow[] => {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const sample = lines.slice(0, 5).join('\n');
  const sep = sample.includes(';') ? ';' : sample.includes('\t') ? '\t' : ',';

  // Se houver cabeçalho com "Valor", usa as colunas pelo nome
  let header: { date: number; desc: number; amount: number } | null = null;
  for (const line of lines.slice(0, 10)) {
    const cols = splitCSVLine(line, sep).map(c => c.toLowerCase());
    const amount = cols.findIndex(c => c.startsWith('valor') || c === 'value' || c === 'amount');
    const date = cols.findIndex(c => c.startsWith('data') || c === 'date');
    if (amount !== -1 && date !== -1) {
      const desc = cols.findIndex(c => /hist|descri|lan[cç]amento|memo/.test(c));
      header = { date, desc, amount };
      break;
    }
  }

  const rows: ParsedRow[] = [];
  for (const line of lines) {
    const cols = splitCSVLine(line, sep);
    if (cols.length < 2) continue;

    let dateIdx: number, amountIdx: number, descIdx: number;
    if (header) {
      dateIdx = header.date; amountIdx = header.amount; descIdx = header.desc;
    } else {
      dateIdx = cols.findIndex(c => parseDateBR(c) !== null);
      const numeric = cols.map((c, i) => (i !== dateIdx && /\d/.test(c) && parseBRNumber(c) !== null ? i : -1)).filter(i => i !== -1);
      // Prefere colunas com cara de dinheiro (",00"), evitando nº de documento
      amountIdx = numeric.find(i => MONEY_LIKE.test(cols[i])) ?? numeric[0] ?? -1;
      descIdx = -1;
    }
    if (dateIdx === -1 || amountIdx === -1 || !cols[dateIdx] || !cols[amountIdx]) continue;
    const date = parseDateBR(cols[dateIdx]);
    const amount = parseBRNumber(cols[amountIdx]);
    if (!date || amount === null || amount === 0) continue;

    let description = descIdx !== -1 ? cols[descIdx] : '';
    if (!description) {
      description = cols
        .filter((c, i) => i !== dateIdx && i !== amountIdx && c.length > 0 && parseBRNumber(c) === null)
        .sort((x, y) => y.length - x.length)[0] || 'Importado via CSV';
    }
    rows.push({ date, amount, description });
  }
  return rows;
};

export const parseOFXRows = (text: string): ParsedRow[] => {
  const rows: ParsedRow[] = [];
  const stmtRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>))/gi;
  let match;
  while ((match = stmtRegex.exec(text)) !== null) {
    const block = match[1];
    const tag = (name: string) => {
      const m = new RegExp(`<${name}>([^<\\r\\n]*)`, 'i').exec(block);
      return m ? m[1].trim() : '';
    };
    const dt = tag('DTPOSTED');
    const amt = parseFloat(tag('TRNAMT').replace(',', '.'));
    if (!/^\d{8}/.test(dt) || isNaN(amt) || amt === 0) continue;
    const description = tag('MEMO') || tag('NAME') || 'Lançamento do extrato';
    rows.push({ date: `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`, amount: amt, description });
  }
  return rows;
};

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImportBackup, onImportTransactions, accounts, categories, existingTransactions }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [accountId, setAccountId] = useState(accounts.find(a => a.type === 'BANK')?.id || accounts[0]?.id || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Importados entram em "A Classificar" (se existir) para ficarem visíveis como pendentes na DRE
  const defaultCategory = (type: TransactionType) =>
    categories.find(c => c.id === UNCLASSIFIED_CATEGORY_ID)?.id
    || categories.find(c => c.type === type)?.id || categories.find(c => c.type === 'BOTH')?.id || '';

  const importRows = (rows: ParsedRow[], source: string) => {
    if (!accountId) { setError('Selecione a conta onde os lançamentos serão registrados.'); return; }
    if (rows.length === 0) {
      setError('Nenhum lançamento válido encontrado. O arquivo precisa ter, em cada linha, uma data, uma descrição e um valor.');
      return;
    }
    // Lançamentos existentes nesta conta; cada um pode "casar" com no máximo uma linha do arquivo.
    const pool = existingTransactions
      .filter(t => t.accountId === accountId)
      .map(t => ({ type: t.type, amount: t.amount, day: parseDate(t.paymentDate || t.dueDate || t.accrualDate).getTime(), used: false }));

    const toImport: Omit<Transaction, 'id' | 'createdAt'>[] = [];
    let duplicates = 0;
    for (const row of rows) {
      const type = row.amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME;
      const amount = Math.round(Math.abs(row.amount) * 100) / 100;
      const day = parseDate(row.date).getTime();
      const match = pool.find(p => !p.used && p.type === type && Math.abs(p.amount - amount) < 0.005 && Math.abs(p.day - day) <= 2 * 86400000);
      if (match) { match.used = true; duplicates++; continue; }
      toImport.push({
        type,
        description: row.description,
        amount,
        accrualDate: row.date,
        dueDate: row.date,
        paymentDate: row.date,
        status: TransactionStatus.PAID,
        paymentMethod: PaymentMethod.TRANSFER,
        accountId,
        categoryId: defaultCategory(type),
        costCenter: 'Operacional',
        observations: `Importado de ${source}`,
      });
    }
    const dupMsg = duplicates > 0 ? ` ${duplicates} já existiam e foram ignorados.` : '';
    if (toImport.length === 0) {
      setError(`Nenhum lançamento novo.${dupMsg}`);
      return;
    }
    onImportTransactions(toImport, { fileName: source, accountId, duplicates });
    setSuccess(`${toImport.length} lançamento(s) importado(s) como pagos.${dupMsg} Eles entraram como "A Classificar". Para desfazer, use o Histórico de Importações em Configurações.`);
  };

  const MAX_FILE_MB = 10;
  const handleFile = (file: File) => {
    setError(null);
    setSuccess(null);
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Arquivo muito grande (limite de ${MAX_FILE_MB} MB).`);
      return;
    }
    const name = file.name.toLowerCase();
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        if (name.endsWith('.json')) {
          if (!window.confirm('Restaurar este backup vai SUBSTITUIR todos os dados atuais.\nUma cópia dos dados atuais será baixada antes. Deseja continuar?')) return;
          const ok = onImportBackup(content);
          if (ok) {
            setSuccess('Backup restaurado com sucesso!');
            setTimeout(onClose, 1500);
          } else {
            setError('O arquivo JSON não é um backup válido do AwgFinanceiro.');
          }
        } else if (name.endsWith('.ofx')) {
          importRows(parseOFXRows(content), file.name);
        } else if (name.endsWith('.csv') || name.endsWith('.txt')) {
          // Arquivos de bancos às vezes vêm em Latin-1: se aparecer o caractere de substituição, relê.
          if (content.includes('\uFFFD')) {
            const r2 = new FileReader();
            r2.onload = ev => importRows(parseCSVRows(ev.target?.result as string), file.name);
            r2.readAsText(file, 'ISO-8859-1');
            return;
          }
          importRows(parseCSVRows(content), file.name);
        } else {
          setError('Formato não suportado. Envie .json (backup), .ofx (extrato bancário) ou .csv (planilha).');
        }
      } catch (err) {
        console.error(err);
        setError('Erro ao processar o arquivo. Verifique o formato.');
      }
    };

    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Importar Dados</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Fechar (Esc)">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center gap-1.5">
              <FileJson size={22} className="text-moura-orange-500" />
              <span className="text-xs font-bold dark:text-slate-200">Backup (.json)</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Substitui todos os dados</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center gap-1.5">
              <Landmark size={22} className="text-moura-orange-500" />
              <span className="text-xs font-bold dark:text-slate-200">Extrato (.ofx)</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Formato padrão dos bancos</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center gap-1.5">
              <FileSpreadsheet size={22} className="text-emerald-500" />
              <span className="text-xs font-bold dark:text-slate-200">Planilha (.csv)</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Data, descrição e valor</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Conta dos lançamentos (extrato / planilha)</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-moura-orange-500 focus:ring-2 focus:ring-moura-orange-500/20 dark:text-slate-100 text-sm font-medium">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all ${dragActive ? 'border-moura-orange-500 bg-moura-orange-50 dark:bg-moura-orange-900/20' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          >
            <Upload size={32} className={dragActive ? 'text-moura-orange-500' : 'text-slate-400'} />
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Arraste seu arquivo aqui</p>
              <p className="text-xs text-slate-500 mt-1">ou clique para selecionar</p>
            </div>
            <input ref={inputRef} type="file" accept=".csv,.json,.ofx,.txt" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            <button onClick={() => inputRef.current?.click()}
              className="px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white text-sm font-bold rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
              Procurar Arquivo
            </button>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-sm font-semibold rounded-xl flex gap-3 items-start border border-rose-200 dark:border-rose-800/50">
              <AlertCircle size={18} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-semibold rounded-xl flex gap-3 items-start border border-emerald-200 dark:border-emerald-800/50">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> {success}
            </div>
          )}

          <div className="p-4 bg-moura-orange-50 dark:bg-moura-orange-900/20 rounded-xl border border-moura-orange-100 dark:border-moura-orange-900/30">
            <h4 className="text-xs font-bold text-moura-orange-800 dark:text-moura-orange-300 mb-1">Dica: use o extrato em OFX</h4>
            <p className="text-xs text-moura-orange-700 dark:text-moura-orange-400 leading-relaxed">
              No internet banking (Sicredi e outros), exporte o extrato em <strong>OFX</strong> ou <strong>Money</strong>. Lançamentos já existentes
              (mesma conta, valor e data próxima) são ignorados automaticamente, então você pode importar o mesmo período sem duplicar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
