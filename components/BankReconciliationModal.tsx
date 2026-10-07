import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, FileText, X, ArrowRight, RefreshCw, Calendar, DollarSign } from 'lucide-react';
import { Account, Category, Transaction, TransactionType, TransactionStatus, PaymentMethod } from '../types';

interface BankReconciliationModalProps {
  onClose: () => void;
  onImport: (transactions: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
  accounts: Account[];
  categories: Category[];
  existingTransactions: Transaction[];
}

interface ParsedBankItem {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: TransactionType;
  matchedTransactionId?: string;
  selectedCategoryId: string;
  selectedAccountId: string;
  isDuplicate: boolean;
}

export const BankReconciliationModal: React.FC<BankReconciliationModalProps> = ({
  onClose,
  onImport,
  accounts,
  categories,
  existingTransactions,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [parsedItems, setParsedItems] = useState<ParsedBankItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');

  const parseOFXContent = (text: string) => {
    const items: ParsedBankItem[] = [];
    const stmtRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = stmtRegex.exec(text)) !== null) {
      const block = match[1];

      const trnTypeMatch = /<TRNTYPE>(.*?)(?:\r?\n|<)/i.exec(block);
      const rawType = trnTypeMatch ? trnTypeMatch[1].trim().toUpperCase() : 'DEBIT';

      const dateMatch = /<DTPOSTED>(\d{8})/i.exec(block);
      let formattedDate = new Date().toISOString().split('T')[0];
      if (dateMatch && dateMatch[1]) {
        const dStr = dateMatch[1];
        formattedDate = `${dStr.substr(0, 4)}-${dStr.substr(4, 2)}-${dStr.substr(6, 2)}`;
      }

      const amtMatch = /<TRNAMT>([-+]?\d*\.?\d+)/i.exec(block);
      const rawAmount = amtMatch ? parseFloat(amtMatch[1]) : 0;
      const amount = Math.abs(rawAmount);

      const memoMatch = /<MEMO>(.*?)(?:\r?\n|<)/i.exec(block);
      const nameMatch = /<NAME>(.*?)(?:\r?\n|<)/i.exec(block);
      const description = (memoMatch ? memoMatch[1] : (nameMatch ? nameMatch[1] : 'Lançamento Extrato')).trim();

      const type = rawAmount < 0 || rawType === 'DEBIT' ? TransactionType.EXPENSE : TransactionType.INCOME;

      const matched = existingTransactions.find(t => 
        t.amount === amount && 
        t.type === type && 
        Math.abs(new Date(t.accrualDate).getTime() - new Date(formattedDate).getTime()) <= 172800000
      );

      const defaultCategory = categories.find(c => c.type === type || c.type === 'BOTH');

      items.push({
        id: Math.random().toString(36).substr(2, 9),
        date: formattedDate,
        amount,
        description,
        type,
        matchedTransactionId: matched?.id,
        selectedCategoryId: defaultCategory?.id || categories[0]?.id || '',
        selectedAccountId: selectedAccountId,
        isDuplicate: Boolean(matched)
      });
    }

    return items;
  };

  const parseCSVContent = (text: string) => {
    const items: ParsedBankItem[] = [];
    const lines = text.split(/\r?\n/);
    
    for (const line of lines) {
      if (!line.trim() || line.toLowerCase().includes('data') || line.toLowerCase().includes('date')) continue;

      const cols = line.split(/[,;\t]/).map(c => c.replace(/^["']|["']$/g, '').trim());
      if (cols.length < 2) continue;

      let date = new Date().toISOString().split('T')[0];
      const dateCol = cols[0];
      if (dateCol.includes('/')) {
        const parts = dateCol.split('/');
        if (parts.length === 3) {
          date = `${parts[2].padStart(4, '20')}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else if (dateCol.includes('-')) {
        date = dateCol;
      }

      const description = cols[1] || 'Lançamento CSV';
      let rawAmount = parseFloat(cols[2]?.replace(/\./g, '').replace(',', '.') || '0');
      if (isNaN(rawAmount)) rawAmount = 0;

      const type = rawAmount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME;
      const amount = Math.abs(rawAmount);

      const matched = existingTransactions.find(t => 
        t.amount === amount && 
        t.type === type
      );

      const defaultCategory = categories.find(c => c.type === type || c.type === 'BOTH');

      items.push({
        id: Math.random().toString(36).substr(2, 9),
        date,
        amount,
        description,
        type,
        matchedTransactionId: matched?.id,
        selectedCategoryId: defaultCategory?.id || categories[0]?.id || '',
        selectedAccountId: selectedAccountId,
        isDuplicate: Boolean(matched)
      });
    }

    return items;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      let items: ParsedBankItem[] = [];

      if (file.name.toLowerCase().endsWith('.ofx')) {
        items = parseOFXContent(content);
      } else {
        items = parseCSVContent(content);
      }

      setParsedItems(items);
      setIsProcessing(false);
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirmImport = () => {
    const toImport = parsedItems
      .filter(item => !item.isDuplicate)
      .map(item => ({
        type: item.type,
        description: item.description,
        amount: item.amount,
        accrualDate: item.date,
        dueDate: item.date,
        paymentDate: item.date,
        categoryId: item.selectedCategoryId,
        accountId: selectedAccountId,
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PAID,
        observations: `Importado via extrato (${fileName})`
      }));

    onImport(toImport);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
          <h2 className="text-lg font-bold">Importação e Conciliação Bancária</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>CONTA BANCÁRIA</label>
              <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full px-4 py-2 border rounded-xl">
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
            <div>
              <label>ARQUIVO (.OFX ou .CSV)</label>
              <input type="file" accept=".ofx,.csv,.txt" onChange={handleFileUpload} />
            </div>
          </div>
          {parsedItems.length > 0 && (
            <div className="overflow-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr><th>STATUS</th><th>DATA</th><th>DESCRIÇÃO</th><th>VALOR</th></tr>
                </thead>
                <tbody>
                  {parsedItems.map(item => (
                    <tr key={item.id}>
                      <td>{item.isDuplicate ? 'Duplicado' : 'Novo'}</td>
                      <td>{item.date}</td>
                      <td>{item.description}</td>
                      <td>{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t flex justify-between">
          <button onClick={onClose} className="px-5 py-2">Cancelar</button>
          <button onClick={handleConfirmImport} className="px-6 py-2 bg-moura-orange-600 text-white rounded-xl">Confirmar</button>
        </div>
      </div>
    </div>
  );
};
