import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useNavigation } from '../hooks/useNavigation';

const SphereSelection: React.FC = () => {
  const { module } = useParams<{ module: string }>();
  const { structure, loading } = useNavigation();
  const navigate = useNavigate();

  if (loading) return <div className="flex h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>;

  const currentModule = module ? structure[module] : null;

  if (!currentModule) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h2 className="text-xl font-bold dark:text-white">Módulo não encontrado ou vazio.</h2>
        <button onClick={() => navigate('/dashboard')} className="btn-primary px-4 py-2 bg-primary text-white rounded-lg">Voltar ao Início</button>
      </div>
    );
  }

  const spheres = Object.keys(currentModule);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <button onClick={() => navigate('/dashboard')} className="mb-6 flex items-center text-sm font-medium text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-xl mr-1">arrow_back</span>
          Voltar ao Painel
        </button>

        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
            Módulo {module}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Selecione a esfera de atuação para prosseguir.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spheres.map((sphere) => (
            <Link 
              key={sphere}
              to={`/modules/${module}/${sphere}`}
              className="group bg-white dark:bg-card-dark p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all hover:-translate-y-1"
            >
              <div className="size-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">
                  {sphere.toLowerCase().includes('rural') ? 'agriculture' : 
                   sphere.toLowerCase().includes('urbana') ? 'location_city' : 
                   sphere.toLowerCase().includes('trabalhista') ? 'work' : 'gavel'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{sphere}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {currentModule[sphere].length} agente(s) disponível(is).
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SphereSelection;