import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../hooks/useNavigation';
import { useProfile } from '../hooks/useProfile'; // <--- Importe o useProfile
import { toast } from 'react-toastify';

interface Client {
  id: string;
  name: string;
  cpf: string;
  address: string;
  created_at: string;
  status: string;
}

const MyClients: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Hooks
  const { availableModules, loading: navLoading } = useNavigation();
  const { permissions } = useProfile(); // <--- Extraia as permissões aqui
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);

  const moduleVisuals: Record<string, any> = {
    'Judicial': { icon: 'gavel', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', desc: 'Ações previdenciárias rurais e urbanas.' },
    'Administrativo': { icon: 'assignment_turned_in', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', desc: 'Requerimentos e recursos no INSS.' },
    'Corporativo': { icon: 'business_center', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', desc: 'Gestão jurídica para empresas.' }
  };

  useEffect(() => {
    if (user) fetchClients();
  }, [user]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, cpf, address, created_at, status')
        // A política RLS já filtra por escritório, não precisa filtrar por user_id se for compartilhado
        // Mas mantemos a lógica original se for o caso. Vamos assumir filtro por escritório via RLS.
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!permissions.canDeleteClients) return; // Bloqueio extra no frontend

    if (!window.confirm('Tem certeza? Isso apagará o histórico deste cliente e todos os documentos associados.')) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      setClients(clients.filter(c => c.id !== id));
      toast.success('Cliente removido.');
    } catch (error) {
      toast.error('Erro ao excluir. Verifique suas permissões.');
    }
  };

  const startNewClient = (path: string) => {
    localStorage.removeItem('temp_client_id_for_doc');
    navigate(path);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cpf?.includes(searchTerm)
  );

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-slate-50 dark:bg-background-dark transition-colors duration-300">
      <div className="w-full max-w-[1280px] px-4 md:px-10 py-8">
        
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8 animate-in slide-in-from-top-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Carteira de Clientes</h1>
            <p className="text-slate-500 dark:text-slate-400">Gerencie seus segurados e acesse os históricos.</p>
          </div>
          
          {/* BOTÃO NOVO CLIENTE: Apenas quem pode gerenciar (Advogado/Assistente/Dono) */}
          {permissions.canManageClients && (
              <button 
                onClick={() => setIsModuleModalOpen(true)}
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5"
              >
                <span className="material-symbols-outlined">person_add</span>
                Novo Cliente
              </button>
          )}
        </div>

        {/* Barra de Busca */}
        <div className="mb-6 relative">
          <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400">search</span>
          <input 
            type="text" 
            placeholder="Buscar por nome ou CPF..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all shadow-sm"
          />
        </div>

        {/* Lista de Clientes */}
        {loading ? (
          <div className="flex justify-center p-10"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-card-dark rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">group_off</span>
            <p className="text-slate-500 font-medium">Nenhum cliente encontrado.</p>
            {searchTerm && <p className="text-sm text-slate-400">Tente buscar com outro termo.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {filteredClients.map((client) => (
              <div key={client.id} className="group bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-primary/50 transition-all relative">
                
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                      <span className={`size-2.5 rounded-full block ${client.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} title={client.status === 'active' ? 'Ativo' : 'Arquivado'}></span>
                </div>

                <div className="flex items-start justify-between mb-4">
                  <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl uppercase">
                    {client.name.charAt(0)}
                  </div>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Botão Ver (Todos) */}
                    <Link to={`/clients/${client.id}`} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-primary transition-colors" title="Ver Histórico">
                      <span className="material-symbols-outlined">history_edu</span>
                    </Link>
                    
                    {/* BOTÃO EXCLUIR: Apenas Dono (canDeleteClients) */}
                    {permissions.canDeleteClients && (
                        <button onClick={() => handleDelete(client.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-slate-500 hover:text-red-500 transition-colors" title="Excluir">
                        <span className="material-symbols-outlined">delete</span>
                        </button>
                    )}
                  </div>
                </div>
                
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1 truncate">{client.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">badge</span> {client.cpf || 'Sem CPF'}
                </p>
                
                <Link to={`/clients/${client.id}`} className="block w-full py-2.5 text-center rounded-lg bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-primary hover:text-white transition-colors">
                  Acessar Prontuário
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE SELEÇÃO DE MÓDULO */}
      {isModuleModalOpen && permissions.canManageClients && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-card-dark w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Iniciar Novo Atendimento</h3>
                <p className="text-sm text-slate-500">Escolha o módulo para criar o documento.</p>
              </div>
              <button onClick={() => setIsModuleModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              
              {navLoading ? (
                 <div className="text-center p-4"><span className="material-symbols-outlined animate-spin text-primary">progress_activity</span></div>
              ) : availableModules.length > 0 ? (
                 availableModules.map(modName => {
                    const visual = moduleVisuals[modName] || { icon: 'folder', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800', desc: 'Módulo personalizado.' };
                    
                    return (
                        <button 
                            key={modName}
                            onClick={() => startNewClient(`/modules/${modName}`)}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group text-left"
                        >
                            <div className={`size-10 rounded-full flex items-center justify-center ${visual.bg} ${visual.color}`}>
                                <span className="material-symbols-outlined">{visual.icon}</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{modName}</h4>
                                <p className="text-sm text-slate-500">{visual.desc}</p>
                            </div>
                            <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">arrow_forward</span>
                        </button>
                    );
                 })
              ) : (
                 <p className="text-center text-slate-500 py-4">Nenhum módulo ativo. Vá ao painel Admin.</p>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyClients;