import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus, KeyRound, AlertCircle, CheckCircle2, Shield, ArrowRight } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, resetPasswordEmail } from '../lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const translateError = (err: any): string => {
    const msg = err.message || String(err);
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado no sistema.';
    if (msg.includes('Password should be at least')) return 'A senha deve ter no mínimo 6 caracteres.';
    if (msg.includes('Unable to validate email address')) return 'Por favor, insira um e-mail válido.';
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        setSuccessMsg('Login realizado com sucesso!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else if (mode === 'register') {
        if (!name.trim()) {
          setError('Por favor, informe seu nome.');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, name);
        setSuccessMsg('Conta criada com sucesso! Você já pode acessar.');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else if (mode === 'forgot') {
        await resetPasswordEmail(email);
        setSuccessMsg('Enviamos um e-mail com instruções para redefinir sua senha.');
      }
    } catch (err: any) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="p-8 pb-6 text-center border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-moura-orange-500/10 text-moura-orange-500 dark:bg-moura-orange-500/20">
            <Shield size={28} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {mode === 'login' && 'Acessar o AWG Financeiro'}
            {mode === 'register' && 'Criar Nova Conta'}
            {mode === 'forgot' && 'Recuperar Senha'}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {mode === 'login' && 'Digite seu e-mail e senha para entrar'}
            {mode === 'register' && 'Preencha os dados abaixo para se cadastrar'}
            {mode === 'forgot' && 'Informe seu e-mail para receber o link de redefinição'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Nome Completo
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu Nome ou Nome da Empresa"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-moura-orange-500 dark:text-slate-100 text-sm transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              E-mail de Acesso
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-moura-orange-500 dark:text-slate-100 text-sm transition-all"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Senha
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }}
                    className="text-xs font-semibold text-moura-orange-500 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-moura-orange-500 dark:text-slate-100 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-moura-orange-500 hover:bg-moura-orange-600 text-white font-bold rounded-xl shadow-lg shadow-moura-orange-500/20 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'login' && <LogIn size={18} />}
                {mode === 'register' && <UserPlus size={18} />}
                {mode === 'forgot' && <KeyRound size={18} />}
                <span>
                  {mode === 'login' && 'Entrar no Sistema'}
                  {mode === 'register' && 'Cadastrar Conta'}
                  {mode === 'forgot' && 'Enviar Link de Recuperação'}
                </span>
              </>
            )}
          </button>

          {/* Toggle modes */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
            {mode === 'login' ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ainda não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
                  className="font-bold text-moura-orange-500 hover:underline"
                >
                  Criar conta grátis
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                  className="font-bold text-moura-orange-500 hover:underline"
                >
                  Fazer Login
                </button>
              </p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium"
            >
              Continuar no modo demonstração local <ArrowRight size={12} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default AuthModal;
