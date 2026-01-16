import React from 'react';
import { Link } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
            <span className="material-symbols-outlined text-3xl">auto_awesome</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Esqueceu sua senha?</h1>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400">Sem problemas. Insira seu e-mail abaixo e enviaremos um link para redefinir sua senha.</p>
        </div>
        
        <form className="mt-8 flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
          <div className="flex flex-col">
            <label className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">E-mail</label>
            <input 
              required
              id="email" 
              type="email" 
              className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-primary" 
              placeholder="seu.email@exemplo.com"
            />
          </div>
          
          <button className="flex h-12 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary text-base font-bold text-white transition-colors hover:bg-primary/90">
            <span className="truncate">Enviar link de recuperação</span>
          </button>
        </form>
        
        <div className="mt-6 flex items-center justify-center">
          <Link to="/" className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-primary hover:underline dark:text-slate-400 dark:hover:text-primary">Voltar para o login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
