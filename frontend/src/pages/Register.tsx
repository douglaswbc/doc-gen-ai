import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom'; // Importe useSearchParams
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // Hook para ler URL

  // Lê parâmetros do convite (oid = Office ID, job = Job Title)
  const inviteOfficeId = searchParams.get('oid');
  const inviteJobTitle = searchParams.get('job');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [officeName, setOfficeName] = useState('');

  // Busca o nome do escritório se for um convite
  useEffect(() => {
    if (inviteOfficeId) {
      const fetchOffice = async () => {
        const { data } = await supabase.from('offices').select('name').eq('id', inviteOfficeId).single();
        if (data) setOfficeName(data.name);
      };
      fetchOffice();
    }
  }, [inviteOfficeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      if (!inviteOfficeId && !officeName) {
        toast.error('Por favor, informe o nome do seu escritório.');
        setLoading(false);
        return;
      }

      // Prepara os metadados - O trigger handle_new_user cuidará de criar o escritório
      const metaData = inviteOfficeId ? {
        full_name: name,
        role: 'user',
        office_id: inviteOfficeId,
        job_title: inviteJobTitle || 'Advocate'
      } : {
        full_name: name,
        role: 'office',
        office_name: officeName, // Enviado para o Trigger
        job_title: 'Advocate'
      };

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metaData,
        },
      });

      if (error) throw error;

      toast.success('Conta criada com sucesso!');
      navigate('/');
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-slate-50 dark:bg-background-dark transition-colors duration-300">

      {/* Header */}
      <header className="absolute top-0 left-0 flex w-full items-center justify-between px-6 py-4 sm:px-10 z-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-dark.png" alt="PREVAI" className="h-8 w-auto dark:hidden" onError={(e) => e.currentTarget.style.display = 'none'} />
            <img src="/logo-white.png" alt="PREVAI" className="h-8 w-auto hidden dark:block" onError={(e) => e.currentTarget.style.display = 'none'} />
            <h2 className="text-secondary dark:text-white text-xl font-bold tracking-tight">PREV<span className="text-primary">AI</span></h2>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center py-10 px-4">
        <div className="w-full max-w-md bg-white dark:bg-card-dark p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300">

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2 text-center">
              {/* Título Dinâmico */}
              {inviteOfficeId ? (
                <>
                  <span className="inline-block mx-auto bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-2">Convite de Equipe</span>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white">Junte-se ao {officeName || 'Escritório'}</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Crie sua conta para acessar o sistema.</p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-black text-slate-900 dark:text-white">Crie sua Conta</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Comece a gerenciar seu escritório jurídico com IA</p>
                </>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              <label className="flex flex-col">
                <span className="pb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Nome Completo</span>
                <input
                  required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="Seu nome completo" type="text"
                />
              </label>

              <label className="flex flex-col">
                <span className="pb-2 text-sm font-bold text-slate-700 dark:text-slate-300">E-mail Profissional</span>
                <input
                  required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="seuemail@exemplo.com" type="email"
                />
              </label>

              {!inviteOfficeId && (
                <label className="flex flex-col">
                  <span className="pb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Nome do Escritório</span>
                  <input
                    required value={officeName} onChange={(e) => setOfficeName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="Ex: Silva & Associados" type="text"
                  />
                </label>
              )}

              <label className="flex flex-col">
                <span className="pb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Senha</span>
                <div className="relative">
                  <input
                    required value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 pr-10 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-primary">
                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
              </label>

              <label className="flex flex-col">
                <span className="pb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Confirmar Senha</span>
                <input
                  required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showPassword ? "text" : "password"}
                  className={`w-full rounded-lg border ${password && confirmPassword && password !== confirmPassword ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'} bg-slate-50 dark:bg-slate-900/50 p-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all`}
                  placeholder="Repita sua senha"
                />
              </label>

              <button
                type="submit" disabled={loading}
                className="mt-2 w-full flex items-center justify-center rounded-lg bg-primary py-3 text-white font-bold hover:bg-primary/90 transition-all disabled:opacity-70 shadow-lg shadow-primary/20"
              >
                {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : (inviteOfficeId ? 'Aceitar Convite e Criar Conta' : 'Criar Conta de Escritório')}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
            Já tem uma conta? <Link to="/" className="font-bold text-primary hover:underline">Entre aqui</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Register;