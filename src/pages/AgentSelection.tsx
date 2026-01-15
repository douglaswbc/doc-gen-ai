import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNavigation } from '../../hooks/useNavigation'; // Ajuste o import conforme onde salvar o arquivo

const AgentSelection: React.FC = () => {
  const { module, sphere } = useParams<{ module: string; sphere: string }>();
  const navigate = useNavigate();
  const { structure, loading } = useNavigation();

  if (loading) return <div className="flex h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>;

  // Busca a lista de agentes baseada na URL
  const agentsList = (module && sphere && structure[module] && structure[module][sphere]) ? structure[module][sphere] : [];

  const handleSelectAgent = (agent: any) => {
    // Redireciona para Criar Documento já com os parâmetros certos
    const params = new URLSearchParams();
    params.set('type', agent.name); // Nome do agente como "Tipo"
    params.set('sphere', sphere || ''); 
    params.set('tasks', encodeURIComponent(JSON.stringify(agent.features || []))); // Passa as tarefas
    navigate(`/create-document?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center text-sm font-medium text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-xl mr-1">arrow_back</span>
          Voltar
        </button>

        <div className="mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">{module} &rsaquo; {sphere}</span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Escolha seu Especialista</h1>
          <p className="text-slate-500 dark:text-slate-400">Selecione o agente de IA mais adequado para o seu caso.</p>
        </div>

        {agentsList.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl">
            <p className="text-slate-500">Nenhum agente ativo encontrado nesta categoria.</p>
            <button onClick={() => navigate('/dashboard')} className="mt-4 text-primary font-bold hover:underline">Voltar ao Painel</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentsList.map((agent: any) => (
              <div 
                key={agent.id}
                onClick={() => handleSelectAgent(agent)}
                className="group cursor-pointer bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all hover:-translate-y-1 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <span className="material-symbols-outlined text-8xl">smart_toy</span>
                </div>
                
                <div className="relative z-10">
                  <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-2xl">psychology</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{agent.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-3">
                    {agent.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1">
                    {agent.features?.slice(0, 3).map((f: string, i: number) => (
                      <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentSelection;