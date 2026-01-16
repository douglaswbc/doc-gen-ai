import React, { useState, useEffect } from 'react';
import { useAgents, Agent } from '../../hooks/useAgents';
import { useNavigate } from 'react-router-dom';

const AdminAgents: React.FC = () => {
  const { agents, loading, saveAgent, deleteAgent } = useAgents(false);
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  // Filtros de Visualização
  const [filterModule, setFilterModule] = useState<string>('Todos');

  // Lista única de módulos existentes para o filtro
  const availableModules = ['Todos', ...Array.from(new Set(agents.map(a => a.module || 'Judicial')))];

  const [formData, setFormData] = useState<Partial<Agent & { category?: string }>>({
    name: '',
    description: '',
    module: 'Judicial',
    sphere: 'Rural',
    category: 'Agricultores',
    system_instruction: '',
    features: [],
    is_active: true
  });

  // Opções fixas para evitar erros de digitação
  const moduleOptions = ['Judicial', 'Administrativo', 'Corporativo'];
  const sphereOptions = ['Rural', 'Urbana', 'Administrativa', 'Geral'];
  const categoryOptions = [
    'Agricultores',
    'Pescadores',
    'Trabalhadores Urbanos',
    'Incapacidade',
    'Aposentadorias Especiais',
    'Assistencial',
    'Revisões',
    'Consultivo',
    'Geral'
  ];

  const handleEdit = (agent: Agent) => {
    // @ts-ignore
    setFormData({ ...agent, module: agent.module || 'Judicial' });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNew = () => {
    setFormData({
      name: '',
      description: '',
      module: 'Judicial',
      sphere: 'Rural',
      category: 'Agricultores',
      // Template padrão
      system_instruction: `ATUE COMO: Especialista jurídico sênior em Direito {{sphere}}.
OBJETIVO: Redigir {{doc_type}} completa e fundamentada.
CONTEXTO: Utilize os dados fornecidos em {{case_details}}.

DIRETRIZES:
1. Use linguagem formal e persuasiva.
2. Cite jurisprudência atualizada (TNU/STJ).
3. O cabeçalho do escritório e as assinaturas serão inseridos automaticamente pelo sistema, foque no conteúdo jurídico.`,
      features: [],
      is_active: true
    });
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await saveAgent(formData)) setIsEditing(false);
  };

  const addFeature = () => {
    const feat = prompt("Nome da Tarefa (ex: Petição Inicial):");
    if (feat) setFormData({ ...formData, features: [...(formData.features || []), feat] });
  };

  // Filtragem
  const filteredAgents = filterModule === 'Todos'
    ? agents
    : agents.filter(a => (a.module || 'Judicial') === filterModule);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <button onClick={() => navigate('/dashboard')} className="text-sm text-slate-500 hover:text-primary mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Voltar
            </button>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Gerenciar Inteligência (IAs)</h1>
            <p className="text-slate-500">Configure módulos, esferas de atuação e prompts dos agentes.</p>
          </div>

          {!isEditing && (
            <div className="flex gap-2">
              {/* Filtro Rápido */}
              <select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className="input-field px-3 py-2 rounded-lg border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              >
                {availableModules.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <button onClick={handleNew} className="btn-primary px-4 py-2 bg-primary text-white rounded-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">add</span> Novo Agente
              </button>
            </div>
          )}
        </div>

        {/* FORMULÁRIO */}
        {isEditing && (
          <div className="bg-white dark:bg-[#161b22] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl mb-10 animate-in slide-in-from-top-4">
            <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              {formData.id ? 'Editar Agente' : 'Cadastrar Novo Agente'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Linha 1: Módulo, Esfera e Categoria */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Módulo de Atuação</span>
                  <select
                    required
                    value={formData.module}
                    onChange={e => setFormData({ ...formData, module: e.target.value })}
                    className="input-field w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white mt-1"
                  >
                    {moduleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Esfera / Especialidade</span>
                  <select
                    required
                    value={formData.sphere}
                    onChange={e => setFormData({ ...formData, sphere: e.target.value })}
                    className="input-field w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white mt-1"
                  >
                    {sphereOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Categoria</span>
                  <select
                    required
                    value={(formData as any).category || 'Geral'}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="input-field w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white mt-1"
                  >
                    {categoryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </label>
              </div>

              {/* Linha 2: Nome e Descrição */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Nome do Agente</span>
                  <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Descrição Curta</span>
                  <input required type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input-field w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                </label>
              </div>

              {/* Linha 3: Prompt */}
              <label className="block">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Prompt do Sistema (Cérebro da IA)</span>

                {/* ATUALIZADO: Hint sobre formatação automática */}
                <div className="text-xs text-slate-500 mb-2 bg-slate-100 dark:bg-slate-800 p-3 rounded space-y-1">
                  <p><strong>Variáveis disponíveis:</strong> {'{{client_name}}'}, {'{{doc_type}}'}, {'{{case_details}}'}, {'{{legal_context}}'}</p>
                  <p className="text-blue-600 dark:text-blue-400">
                    <span className="material-symbols-outlined text-[10px] mr-1">info</span>
                    O sistema injeta automaticamente: Timbre do Escritório, Lista de Advogados (Assinaturas) e Formatação HTML. Não precisa solicitar isso aqui.
                  </p>
                </div>

                <textarea required rows={8} value={formData.system_instruction} onChange={e => setFormData({ ...formData, system_instruction: e.target.value })} className="input-field w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono text-sm" />
              </label>

              {/* Tarefas e Status */}
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Tarefas Habilitadas</span>
                  <div className="flex flex-wrap gap-2">
                    {formData.features?.map((f, i) => (
                      <span key={i} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded flex items-center gap-1">
                        {f}
                        <button type="button" onClick={() => setFormData({ ...formData, features: formData.features?.filter((_, idx) => idx !== i) })} className="hover:text-red-500">×</button>
                      </span>
                    ))}
                    <button type="button" onClick={addFeature} className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded hover:bg-slate-300">+ Add</button>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                  <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="size-5 rounded text-primary focus:ring-primary" />
                  <label htmlFor="isActive" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Agente Ativo</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 shadow-lg shadow-primary/20">Salvar Alterações</button>
              </div>
            </form>
          </div>
        )}

        {/* LISTA DE AGENTES (Grid Organizado) */}
        {loading ? (
          <div className="flex justify-center p-10"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center p-10 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300">Nenhum agente encontrado neste módulo.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {filteredAgents.map(agent => (
              <div key={agent.id} className={`group relative p-6 bg-white dark:bg-[#161b22] rounded-xl border transition-all hover:-translate-y-1 hover:shadow-lg ${agent.is_active ? 'border-slate-200 dark:border-slate-800' : 'border-dashed border-slate-300 opacity-70'}`}>

                {/* Badges de Topo */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col gap-1">
                    {/* Badge Módulo */}
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {agent.module || 'Geral'}
                    </span>
                    {/* Badges Esfera e Categoria */}
                    <div className="flex gap-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${agent.sphere === 'Rural' ? 'bg-green-100 text-green-700' :
                          agent.sphere === 'Urbana' ? 'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                        {agent.sphere}
                      </span>
                      {(agent as any).category && (agent as any).category !== 'Geral' && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {(agent as any).category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(agent)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-blue-500"><span className="material-symbols-outlined text-lg">edit</span></button>
                    <button onClick={() => deleteAgent(agent.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-red-500"><span className="material-symbols-outlined text-lg">delete</span></button>
                  </div>
                </div>

                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{agent.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 h-10">{agent.description}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400 mb-1 font-bold">Capacidades:</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.features?.slice(0, 3).map((f, i) => (
                      <span key={i} className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">{f}</span>
                    ))}
                    {(agent.features?.length || 0) > 3 && <span className="text-[10px] text-slate-400 px-1 py-0.5">+{agent.features!.length - 3}</span>}
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

export default AdminAgents;