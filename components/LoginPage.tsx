import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus, KeyRound, AlertCircle, CheckCircle2, Shield, ArrowRight, Wallet, Sparkles } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, resetPasswordEmail } from '../lib/auth';
import { CompanySettings } from '../types';

interface LoginPageProps {
  onSuccess: () => void;
  onBypass: () => void;
  settings: CompanySettings;
}

type AuthMode = 'login' | 'register' | 'forgot';

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onBypass, settings }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const translateError = (err: any): string => {
    const msg = (err.message || String(err)).toLowerCase();
    const code = err.code || '';

    if (msg.includes('already registered') || msg.includes('already been registered') || code === 'email_exists' || code === 'user_already_exists') {
      return 'Este e-mail já está cadastrado no sistema. Clique em "Fazer Login" abaixo para entrar com sua senha.';
    }
    if (msg.includes('invalid login credentials') || code === 'invalid_credentials') {
      return 'E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.';
    }
    if (msg.includes('email not confirmed') || code === 'email_not_confirmed') {
      return 'E-mail não confirmado. Verifique a caixa de entrada do seu e-mail para confirmar a conta.';
    }
    if (msg.includes('password should be at least') || code === 'weak_password') {
      return 'A senha deve ter no mínimo 6 caracteres.';
    }
    if (msg.includes('unable to validate email address') || code === 'email_address_invalid') {
      return 'Por favor, insira um e-mail válido.';
    }
    if (msg.includes('failed to fetch') || msg.includes('networkerror')) {
      return 'Não foi possível conectar ao servidor do Supabase. Verifique sua conexão de internet ou desative bloqueadores de anúncios/adblockers.';
    }
    return err.message || String(err);
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
        setTimeout(() => onSuccess(), 400);
      } else if (mode === 'register') {
        if (!name.trim()) {
          setError('Por favor, informe seu nome completo.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres.');
          setLoading(false);
          return;
        }
        const data = await signUpWithEmail(email, password, name);
        if (data.session) {
          setSuccessMsg('Conta criada e autenticada com sucesso!');
          setTimeout(() => onSuccess(), 500);
        } else {
          setSuccessMsg('Conta criada com sucesso! Se a confirmação de e-mail estiver ativa, verifique sua caixa de entrada.');
          setTimeout(() => {
            setMode('login');
            setSuccessMsg('Agora faça login com sua nova conta.');
          }, 2000);
        }
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
    <div className="min-h-screen w-full bg-[#0F172A] flex flex-col lg:flex-row items-center justify-center p-4 lg:p-0 font-sans selection:bg-moura-orange-500/30">
      {/* Lado Esquerdo: Banner de Boas-Vindas */}
      <div className="hidden lg:flex flex-1 flex-col justify-between h-screen p-16 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-r border-slate-800">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-moura-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-moura-orange-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-moura-orange-500/30">
            {settings.name ? settings.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <h1 className="font-extrabold text-white text-xl tracking-tight">{settings.name || 'AWG Financeiro'}</h1>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gestão Financeira Inteligente</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-moura-orange-500/10 border border-moura-orange-500/20 text-moura-orange-400 text-xs font-semibold">
            <Sparkles size={14} /> Sistema Integrado ao Supabase Cloud
          </div>
          <h2 className="text-4xl font-black text-white leading-tight tracking-tight">
            Controle financeiro completo, seguro e em tempo real.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Gerencie receitas, despesas, conciliação bancária, DRE e centros de custo em uma única plataforma executiva.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} {settings.name || 'AWG Financeiro'}. Todos os direitos reservados.
        </div>
      </div>

      {/* Lado Direito: Formulário de Login */}
      <div className="w-full lg:w-[480px] p-6 sm:p-12 flex flex-col justify-center min-h-screen lg:min-h-0">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Logo Mobile */}
          <div className="lg:hidden text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-moura-orange-500 text-white font-black text-2xl shadow-xl shadow-moura-orange-500/30">
              {settings.name ? settings.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">{settings.name || 'AWG Financeiro'}</h2>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {mode === 'login' && 'Acessar o Sistema'}
              {mode === 'register' && 'Criar Nova Conta'}
              {mode === 'forgot' && 'Recuperar Senha'}
            </h3>
            <p className="text-sm text-slate-400">
              {mode === 'login' && 'Insira seus dados de acesso para entrar'}
              {mode === 'register' && 'Crie sua conta para sincronizar seus dados'}
              {mode === 'forgot' && 'Insira seu e-mail para receber as instruções'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-semibold leading-relaxed">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs font-semibold leading-relaxed">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Nome Completo
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Seu Nome ou Nome da Empresa"
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-moura-orange-500 text-white text-sm transition-all placeholder:text-slate-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-moura-orange-500 text-white text-sm transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Senha
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }}
                      className="text-xs font-semibold text-moura-orange-400 hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-moura-orange-500 text-white text-sm transition-all placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-moura-orange-500 hover:bg-moura-orange-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-moura-orange-500/25 transition-all disabled:opacity-50"
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
                    {mode === 'register' && 'Cadastrar Nova Conta'}
                    {mode === 'forgot' && 'Enviar Link de Recuperação'}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Toggle modes & Bypass */}
          <div className="pt-6 border-t border-slate-800 text-center space-y-4">
            {mode === 'login' ? (
              <p className="text-xs text-slate-400">
                Ainda não possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
                  className="font-bold text-moura-orange-400 hover:underline ml-1"
                >
                  Criar conta grátis
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                  className="font-bold text-moura-orange-400 hover:underline ml-1"
                >
                  Fazer Login
                </button>
              </p>
            )}

            <div>
              <button
                type="button"
                onClick={onBypass}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all border border-slate-700/60"
              >
                <span>Usar no modo demonstração local</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
