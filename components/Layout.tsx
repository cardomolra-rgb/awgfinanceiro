import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Tags,
  Users,
  FilePieChart,
  Settings as SettingsIcon,
  PlusCircle,
  Menu,
  X,
  Sun,
  Moon,
  Search,
  Bell,
  ChevronRight,
  LogOut,
  DownloadCloud
} from 'lucide-react';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationDropdown } from './NotificationDropdown';
import { Transaction, Category, Account, Entity, TransactionType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNewTransaction: (type?: TransactionType) => void;
  toggleTheme: () => void;
  settings: any;
  transactions?: Transaction[];
  categories?: Category[];
  accounts?: Account[];
  entities?: Entity[];
  onEditTransaction?: (t: Transaction) => void;
  onBackup?: () => void;
  lastBackupAt?: string;
  needsBackup?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  onNewTransaction,
  toggleTheme,
  settings,
  transactions = [],
  categories = [],
  accounts = [],
  entities = [],
  onEditTransaction,
  onBackup,
  lastBackupAt,
  needsBackup
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const menuGroups = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'transactions', label: 'Lançamentos', icon: ArrowLeftRight },
      ]
    },
    {
      title: 'Financeiro',
      items: [
        { id: 'payable', label: 'Contas a Pagar', icon: ArrowDownCircle },
        { id: 'receivable', label: 'Contas a Receber', icon: ArrowUpCircle },
        { id: 'accounts', label: 'Contas & Bancos', icon: Wallet },
      ]
    },
    {
      title: 'Cadastros & Análise',
      items: [
        { id: 'categories', label: 'Categorias', icon: Tags },
        { id: 'entities', label: 'Contatos', icon: Users },
        { id: 'reports', label: 'Relatórios', icon: FilePieChart },
      ]
    }
  ];

  const currentLabel = menuGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0F172A] overflow-hidden font-sans selection:bg-moura-orange-500/30">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Executiva */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#1E293B] border-r border-slate-200 dark:border-slate-800/60 transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-2xl md:shadow-none
        md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col
      `}>
        {/* Logo / Brand Area */}
        <div className="h-20 px-6 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.name} className="w-10 h-10 rounded-xl object-contain bg-white shadow" />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg"
                style={{ background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.primaryColor}dd)` }}
              >
                {(settings.name || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-800 dark:text-white tracking-tight leading-tight">{settings.name}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AwgFinanceiro</span>
            </div>
          </div>
          <button className="md:hidden p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500" onClick={() => setIsSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Action Button (Novo Lançamento) */}
        <div className="p-5 pb-2 shrink-0">
          <button
            onClick={() => onNewTransaction()}
            className="w-full group relative flex items-center justify-center gap-2 py-3.5 text-white rounded-xl font-bold overflow-hidden transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: settings.primaryColor, boxShadow: `0 10px 15px -3px ${settings.primaryColor}40` }}
          >
            <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full -translate-x-full transition-transform duration-500 skew-x-12"></div>
            <PlusCircle size={20} className="relative z-10" />
            <span className="relative z-10">Novo Lançamento</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto custom-scrollbar">
          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <h3 className="px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                {group.title}
              </h3>
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`
                      w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group overflow-hidden
                      ${isActive
                        ? ''
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'}
                    `}
                    style={isActive ? { color: settings.primaryColor, backgroundColor: `${settings.primaryColor}15` } : {}}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r-full" style={{ backgroundColor: settings.primaryColor }}></div>
                    )}
                    <item.icon size={20} className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer / User Profile & Settings */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 space-y-1">
          {onBackup && (
            <button
              onClick={() => { onBackup(); setIsSidebarOpen(false); }}
              title="Baixa um arquivo com todos os dados do sistema"
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:bg-slate-200/50 dark:hover:bg-slate-800"
            >
              <div className="relative w-9 h-9 rounded-full bg-moura-orange-50 dark:bg-moura-orange-900/30 flex items-center justify-center border-2 border-white dark:border-slate-800">
                <DownloadCloud size={18} className="text-moura-orange-600 dark:text-moura-orange-400" />
                {needsBackup && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900" />}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Fazer Backup</p>
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${needsBackup ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
                  {lastBackupAt ? `Último: ${new Date(lastBackupAt).toLocaleDateString('pt-BR')}` : 'Nunca feito'}
                </p>
              </div>
            </button>
          )}
          <button
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-slate-200/50 dark:bg-slate-800' : 'hover:bg-slate-200/50 dark:hover:bg-slate-800'}`}
          >
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border-2 border-white dark:border-slate-800">
              <SettingsIcon size={18} className="text-slate-600 dark:text-slate-300" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Configurações</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Preferências do App</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-[#0F172A] relative">
        
        {/* Topbar Executiva */}
        <header className="h-20 bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/60 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            
            {/* Breadcrumb Style Title */}
            <div className="hidden md:flex items-center gap-2 text-slate-400 font-semibold text-sm">
              <span className="text-slate-400">AwgFinanceiro</span>
              <ChevronRight size={14} />
              <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                {currentLabel}
              </h1>
            </div>
            <h1 className="md:hidden text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              {currentLabel}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Interactive Global Search Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400 text-sm font-medium border border-transparent rounded-full transition-all w-64 text-left shadow-xs group"
              title="Abrir busca global (Cmd+K)"
            >
              <Search size={16} className="text-slate-400 group-hover:text-moura-orange-500 transition-colors" />
              <span className="bg-transparent text-slate-500 dark:text-slate-400 text-xs font-medium truncate flex-1">
                Buscar em tudo (Cmd+K)...
              </span>
            </button>

            {/* Notification Bell Dropdown Container */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(prev => !prev)}
                className="relative p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                title="Notificações do Sistema"
              >
                <Bell size={20} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-[#1E293B] animate-pulse"></span>
              </button>

              <NotificationDropdown
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                transactions={transactions}
                accounts={accounts}
                setActiveTab={setActiveTab}
                currency={settings.currency}
              />
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

            <button
              onClick={toggleTheme}
              className="p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title="Alternar Tema"
            >
              {settings.theme === 'dark' ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-blue-600" />}
            </button>
          </div>
        </header>

        {/* Global Search Command Palette Modal */}
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          entities={entities}
          setActiveTab={setActiveTab}
          onNewTransaction={onNewTransaction}
          onEditTransaction={onEditTransaction}
          currency={settings.currency}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

    </div>
  );
};

export default Layout;
