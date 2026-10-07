import React, { useMemo, useState } from 'react';
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Wallet,
  X,
  ChevronRight,
  CheckCheck
} from 'lucide-react';
import { Transaction, Account, TransactionType } from '../types';
import { formatCurrency } from '../lib/utils';
import { parseDate, startOfToday } from '../lib/dates';
import { dueDateOf, isOverdue, isPaid } from '../lib/finance';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  accounts: Account[];
  setActiveTab: (tab: string) => void;
  currency?: string;
}

export interface SystemNotification {
  id: string;
  type: 'WARNING' | 'INFO' | 'SUCCESS' | 'URGENT';
  title: string;
  message: string;
  time: string;
  read: boolean;
  targetTab?: string;
  actionText?: string;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  transactions = [],
  accounts = [],
  setActiveTab,
  currency = 'BRL'
}) => {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Generate live notifications based on real data
  const notifications = useMemo(() => {
    const items: SystemNotification[] = [];
    const today = startOfToday();

    const next7Days = new Date(today);
    next7Days.setDate(today.getDate() + 7);

    // 1. Contas a Pagar em Atraso
    const overdueBills = transactions.filter(
      t => t.type === TransactionType.EXPENSE && isOverdue(t, today)
    );

    if (overdueBills.length > 0) {
      const totalOverdue = overdueBills.reduce((acc, t) => acc + t.amount, 0);
      items.push({
        id: 'notif-overdue',
        type: 'URGENT',
        title: `${overdueBills.length} Conta${overdueBills.length > 1 ? 's' : ''} em Atraso!`,
        message: `Total pendente de ${formatCurrency(totalOverdue, currency)}. Evite juros: quite as contas em atraso.`,
        time: 'Hoje',
        read: readIds.has('notif-overdue'),
        targetTab: 'payable',
        actionText: 'Ver Contas a Pagar'
      });
    }

    // 2. Próximos Vencimentos (Próximos 7 dias)
    const upcomingBills = transactions.filter(t => {
      if (t.type !== TransactionType.EXPENSE || isPaid(t)) return false;
      const due = parseDate(dueDateOf(t));
      return due >= today && due <= next7Days;
    });

    if (upcomingBills.length > 0) {
      const totalUpcoming = upcomingBills.reduce((acc, t) => acc + t.amount, 0);
      items.push({
        id: 'notif-upcoming',
        type: 'WARNING',
        title: `${upcomingBills.length} Vencimento${upcomingBills.length > 1 ? 's' : ''} nos Próximos 7 Dias`,
        message: `Total de ${formatCurrency(totalUpcoming, currency)} a vencer até ${next7Days.toLocaleDateString('pt-BR')}.`,
        time: 'Esta Semana',
        read: readIds.has('notif-upcoming'),
        targetTab: 'payable',
        actionText: 'Ver Agendamentos'
      });
    }

    // 3. Saldo Total em Bancos
    const totalBalance = accounts.reduce((acc, a) => acc + (a.balance ?? a.initialBalance), 0);
    items.push({
      id: 'notif-balance',
      type: totalBalance >= 0 ? 'SUCCESS' : 'URGENT',
      title: 'Resumo de Saldo em Contas',
      message: `O saldo somado de todas as contas é de ${formatCurrency(totalBalance, currency)}.`,
      time: 'Agora',
      read: readIds.has('notif-balance'),
      targetTab: 'accounts',
      actionText: 'Ver Bancos'
    });

    // 4. Recebimentos em atraso
    const overdueReceivables = transactions.filter(t => t.type === TransactionType.INCOME && isOverdue(t, today));
    if (overdueReceivables.length > 0) {
      const total = overdueReceivables.reduce((acc, t) => acc + t.amount, 0);
      items.push({
        id: 'notif-receivable-overdue',
        type: 'WARNING',
        title: `${overdueReceivables.length} Recebimento${overdueReceivables.length > 1 ? 's' : ''} em Atraso`,
        message: `${formatCurrency(total, currency)} de clientes com vencimento passado.`,
        time: 'Hoje',
        read: readIds.has('notif-receivable-overdue'),
        targetTab: 'receivable',
        actionText: 'Ver Contas a Receber'
      });
    }

    return items;
  }, [transactions, accounts, readIds, currency]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setReadIds(new Set(notifications.map(n => n.id)));
  };

  const handleItemClick = (n: SystemNotification) => {
    setReadIds(prev => new Set(prev).add(n.id));
    if (n.targetTab) {
      setActiveTab(n.targetTab);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-moura-orange-500" />
          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-bold text-moura-orange-600 dark:text-moura-orange-400 hover:underline flex items-center gap-1"
              title="Marcar todas como lidas"
            >
              <CheckCheck size={14} /> Lidas
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar">
        {notifications.map(n => (
          <div
            key={n.id}
            onClick={() => handleItemClick(n)}
            className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative group ${
              !n.read ? 'bg-moura-orange-50/30 dark:bg-moura-orange-950/10' : ''
            }`}
          >
            {!n.read && (
              <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-moura-orange-500"></span>
            )}
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                n.type === 'URGENT' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40' :
                n.type === 'WARNING' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40' :
                n.type === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' :
                'bg-blue-100 text-blue-600 dark:bg-blue-900/40'
              }`}>
                {n.type === 'URGENT' ? <AlertTriangle size={18} /> :
                 n.type === 'WARNING' ? <Clock size={18} /> :
                 n.type === 'SUCCESS' ? <CheckCircle2 size={18} /> :
                 <Wallet size={18} />}
              </div>

              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">{n.title}</h4>
                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">{n.time}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">{n.message}</p>
                {n.actionText && (
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-moura-orange-600 dark:text-moura-orange-400 group-hover:translate-x-1 transition-transform">
                    <span>{n.actionText}</span>
                    <ChevronRight size={12} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-center">
        <button
          onClick={() => { setActiveTab('payable'); onClose(); }}
          className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-moura-orange-600 transition-colors"
        >
          Ver Central de Contas a Pagar →
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
