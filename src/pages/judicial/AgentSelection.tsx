import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNavigation } from '../../hooks/useNavigation';

// Ícones e cores por categoria
const categoryVisuals: Record<string, { icon: string; color: string; bg: string }> = {
  'Agricultores': { icon: 'agriculture', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  'Pescadores': { icon: 'phishing', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  'Trabalhadores Urbanos': { icon: 'apartment', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  'Incapacidade': { icon: 'medical_services', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
  'Aposentadorias Especiais': { icon: 'workspace_premium', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  'Assistencial': { icon: 'volunteer_activism', color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  'Revisões': { icon: 'edit_document', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  'Consultivo': { icon: 'psychology', color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  'Geral': { icon: 'smart_toy', color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800/50' },
};

const AgentSelection: React.FC = () => {
  const { module, sphere } = useParams<{ module: string; sphere: string }>();
  const navigate = useNavigate();
  const { structure, loading } = useNavigation();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Agricultores', 'Pescadores', 'Trabalhadores Urbanos']));

  const currentModule = module || 'Judicial';
  const agentsList = (currentModule && sphere && structure[currentModule] && structure[currentModule][sphere])
    ? structure[currentModule][sphere]
    : [];

  // Agrupar agentes por categoria
  const groupedAgents = useMemo(() => {
    const groups: Record<string, any[]> = {};
    agentsList.forEach((agent: any) => {
      const cat = agent.category || 'Geral';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(agent);
    });
    // Ordenar categorias (Agricultores primeiro, Geral por último)
    const order = ['Agricultores', 'Pescadores', 'Trabalhadores Urbanos', 'Incapacidade', 'Aposentadorias Especiais', 'Assistencial', 'Revisões', 'Consultivo', 'Geral'];
    const sorted: Record<string, any[]> = {};
    order.forEach(cat => {
      if (groups[cat]) sorted[cat] = groups[cat];
    });
    // Adicionar categorias não listadas
    Object.keys(groups).forEach(cat => {
      if (!sorted[cat]) sorted[cat] = groups[cat];
    });
    return sorted;
  }, [agentsList]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleSelectAgent = (agent: any) => {
    const params = new URLSearchParams();
    params.set('type', agent.name);
    params.set('sphere', sphere || '');
    params.set('tasks', encodeURIComponent(JSON.stringify(agent.features || [])));
    navigate(`/create-document?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center text-sm font-medium text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-xl mr-1">arrow_back</span>
          Voltar
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">{currentModule}</span>
            <span className="text-xs text-slate-400">&rsaquo;</span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{sphere}</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Escolha seu Especialista</h1>
          <p className="text-slate-500 dark:text-slate-400">Selecione o agente de IA mais adequado para o seu caso.</p>
        </div>

        {Object.keys(groupedAgents).length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl bg-white dark:bg-card-dark">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">search_off</span>
            <p className="text-slate-500 font-medium">Nenhum agente ativo encontrado nesta categoria.</p>
            <button onClick={() => navigate('/dashboard')} className="mt-4 text-primary font-bold hover:underline">Voltar ao Painel</button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedAgents).map(([category, agents]) => {
              const visual = categoryVisuals[category] || categoryVisuals['Geral'];
              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category} className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className={`w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isExpanded ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-lg ${visual.bg} ${visual.color} flex items-center justify-center`}>
                        <span className="material-symbols-outlined">{visual.icon}</span>
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-slate-900 dark:text-white">{category}</h3>
                        <p className="text-xs text-slate-500">{agents.length} agente{agents.length > 1 ? 's' : ''} disponíve{agents.length > 1 ? 'is' : 'l'}</p>
                      </div>
                    </div>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  {/* Agents Grid */}
                  {isExpanded && (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                      {agents.map((agent: any) => (
                        <div
                          key={agent.id}
                          onClick={() => handleSelectAgent(agent)}
                          className="group cursor-pointer p-4 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`size-8 rounded-full ${visual.bg} ${visual.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                              <span className="material-symbols-outlined text-lg">psychology</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">{agent.name}</h4>
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{agent.description}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {agent.features?.slice(0, 2).map((f: string, i: number) => (
                                  <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">{f}</span>
                                ))}
                                {(agent.features?.length || 0) > 2 && (
                                  <span className="text-[10px] text-slate-400">+{agent.features.length - 2}</span>
                                )}
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentSelection;