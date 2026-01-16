import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 1. Novo estado para controlar a visibilidade da senha
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Falha no login. Verifique seu e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-slate-50 dark:bg-background-dark transition-colors duration-300">
      <div className="layout-container flex h-full grow flex-col">
         
         {/* Header com Logo Dinâmica */}
         <header className="absolute left-0 top-0 flex w-full items-center justify-between px-6 py-4 sm:px-10 z-10">
            <div className="flex items-center gap-3">
                <img 
                    src="/logo-dark.png" 
                    alt="PREVAI Logo" 
                    className="h-8 w-auto dark:hidden" 
                    onError={(e) => e.currentTarget.style.display = 'none'} 
                />
                <img 
                    src="/logo-white.png" 
                    alt="PREVAI Logo" 
                    className="h-8 w-auto hidden dark:block" 
                    onError={(e) => e.currentTarget.style.display = 'none'}
                />
                <div className="flex items-center gap-2 logo-text-fallback">
                   <h2 className="text-secondary dark:text-white text-xl font-bold tracking-tight">
                     PREV<span className="text-primary">AI</span>
                   </h2>
                </div>
            </div>
        </header>

        <main className="flex flex-1 items-center justify-center py-10 px-4">
          <div className="w-full max-w-md bg-white dark:bg-card-dark p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300">
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2 text-center mb-4">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Acesse sua conta</h1>
                <h2 className="text-sm text-slate-500 dark:text-slate-400">Bem-vindo de volta! Insira suas credenciais.</h2>
              </div>
              
              <div className="flex flex-col gap-5">
                {/* Campo E-mail */}
                <label className="flex flex-col">
                  <span className="pb-2 text-sm font-bold text-slate-700 dark:text-slate-300">E-mail</span>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <span className="material-symbols-outlined text-lg">mail</span>
                    </div>
                    <input 
                      required
                      type="email" 
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 pl-10 pr-3 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" 
                      placeholder="seuemail@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </label>
                
                {/* Campo Senha com Olho */}
                <label className="flex flex-col">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Senha</span>
                    <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">Esqueci a senha</Link>
                  </div>
                  <div className="relative">
                    {/* Ícone Cadeado (Esquerda) */}
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <span className="material-symbols-outlined text-lg">lock</span>
                    </div>
                    
                    <input 
                      required
                      // 2. Tipo dinâmico baseado no estado
                      type={showPassword ? "text" : "password"} 
                      // Adicionei pr-10 para o texto não ficar por cima do ícone do olho
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 pl-10 pr-10 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />

                    {/* 3. Botão do Olho (Direita) */}
                    <button
                      type="button" // Importante ser type button para não enviar o form
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-slate-400 hover:text-primary transition-colors focus:outline-none"
                      title={showPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showPassword ? 'visibility' : 'visibility_off'}
                      </span>
                    </button>
                  </div>
                </label>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="mt-2 w-full flex items-center justify-center rounded-lg bg-primary py-3 text-white font-bold hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                  ) : (
                    'Entrar na Plataforma'
                  )}
                </button>
              </div>
              
              <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-2">
                Não tem uma conta? <Link to="/register" className="font-bold text-primary hover:underline">Cadastre-se grátis</Link>
              </p>
            </form>
          </div>
        </main>
        
        <footer className="flex w-full items-center justify-center p-6">
          <p className="text-xs text-slate-400 dark:text-slate-600">© 2025 PREVAI. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default Login;