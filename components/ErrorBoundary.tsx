import React from 'react';

const STORAGE_KEY = 'finance_pro_data_v4';

interface State { error: Error | null }

/**
 * Se alguma tela quebrar, mostra uma mensagem com opções de recuperação em vez de uma página em branco.
 * Os dados continuam salvos no navegador; o botão permite baixá-los antes de qualquer outra ação.
 */
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Registro apenas local (console do navegador); nenhum dado é enviado para fora.
    console.error('Erro na interface:', error, info.componentStack);
  }

  private downloadData = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY) || '{}';
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_awgfinanceiro_emergencia_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      alert('Não foi possível baixar os dados.');
    }
  };

  render() {
    if (!this.state.error) return (this as any).props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">Algo deu errado nesta tela</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Seus dados continuam salvos neste navegador. Baixe uma cópia por segurança e depois recarregue a página.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={this.downloadData} className="w-full py-3 bg-moura-orange-600 hover:bg-moura-orange-700 text-white font-bold rounded-xl">
              Baixar meus dados (backup)
            </button>
            <button onClick={() => window.location.reload()} className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl">
              Recarregar a página
            </button>
          </div>
        </div>
      </div>
    );
  }
}
