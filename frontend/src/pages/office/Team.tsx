import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { toast } from 'react-toastify';

// === CONFIGURAÇÃO DO CLIENTE SECUNDÁRIO ISOLADO ===
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const secondaryClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  job_title: string;
  avatar_url: string | null;
  is_active: boolean;
}

// === NÍVEIS DE ACESSO ===
const ACCESS_LEVELS = [
  {
    id: 'Advocate',
    label: 'Advogado(a)',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    description: 'Acesso total operacional. Pode assinar petições e excluir docs.',
    permissions: [
      { label: 'Criar Documentos', allowed: true },
      { label: 'Assinar (OAB)', allowed: true },
      { label: 'Excluir Dados', allowed: true },
    ]
  },
  {
    id: 'Trainee',
    label: 'Estagiário(a)',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    description: 'Foco na produção de rascunhos.',
    permissions: [
      { label: 'Criar Documentos', allowed: true },
      { label: 'Assinar (OAB)', allowed: false },
      { label: 'Excluir Dados', allowed: false },
    ]
  },
  {
    id: 'Assistant',
    label: 'Assistente',
    color: 'bg-green-100 text-green-700 border-green-200',
    description: 'Apoio administrativo e cadastro.',
    permissions: [
      { label: 'Criar Clientes', allowed: true },
      { label: 'Visualizar Docs', allowed: true },
      { label: 'Editar Peças', allowed: false },
    ]
  }
];

const ITEMS_PER_PAGE = 5; // Quantidade de membros por página

const Team: React.FC = () => {
  const { profile, isOfficeOwner } = useProfile();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado da Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedRole, setSelectedRole] = useState('Advocate');
  const [creating, setCreating] = useState(false);

  const DEFAULT_PASSWORD = "mudar@1234";

  useEffect(() => {
    if (profile?.office_id) {
      fetchMembers();
    }
  }, [profile, currentPage]); // Recarrega se a página mudar

  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      // Calcula o range para paginação (0-4, 5-9, etc)
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Busca dados com paginação
      const { data, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' }) // Pede a contagem total
        .eq('office_id', profile!.office_id)
        .neq('id', profile!.id) // Não listar a si mesmo
        .order('full_name')
        .range(from, to);

      if (error) throw error;
      
      setMembers(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar equipe.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newName) return toast.warning('Preencha todos os campos.');
    setCreating(true);

    try {
      const { data: authData, error: authError } = await secondaryClient.auth.signUp({
        email: newEmail,
        password: DEFAULT_PASSWORD,
        options: {
          data: {
            full_name: newName,
            role: selectedRole.toLowerCase(),
            job_title: selectedRole, 
            office_id: profile?.office_id
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário.");

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: newEmail,
          full_name: newName,
          role: selectedRole.toLowerCase(),
          job_title: selectedRole,
          office_id: profile?.office_id,
          is_active: true,
          plan: 'free',
          documents_limit: 0,
          documents_generated: 0
        });

      if (profileError) {
         console.error("Erro no Profile:", profileError);
         toast.warning("Usuário criado, mas houve um erro ao salvar detalhes.");
      } else {
         toast.success("Membro adicionado com sucesso!");
      }

      setShowModal(false);
      setNewName('');
      setNewEmail('');
      fetchMembers();

    } catch (error: any) {
      console.error(error);
      if (error.message?.includes('registered')) {
        toast.error('Este e-mail já está em uso.');
      } else {
        toast.error(error.message || 'Erro ao criar usuário.');
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    // Optimistic Update
    setMembers(prev => prev.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m));

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (error) {
            setMembers(prev => prev.map(m => m.id === id ? { ...m, is_active: currentStatus } : m));
            throw error;
        }
        toast.success(`Acesso ${!currentStatus ? 'liberado' : 'bloqueado'}.`);
    } catch (error) {
        toast.error("Erro ao alterar status.");
    }
  };

  // Cálculos para paginação
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Gestão de Equipe</h1>
            <p className="text-slate-500">Gerencie os membros do escritório <b>{profile?.office?.name}</b></p>
        </div>
        
        {isOfficeOwner && (
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/30 active:scale-95">
                <span className="material-symbols-outlined">person_add</span>
                Novo Membro
            </button>
        )}
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
        {loading ? (
             <div className="flex-1 flex flex-col items-center justify-center p-12">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">progress_activity</span>
                <p className="text-slate-500">Carregando equipe...</p>
             </div>
        ) : (
            <>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/30 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-4">Colaborador</th>
                            <th className="px-6 py-4">Nível de Acesso</th>
                            {isOfficeOwner && <th className="px-6 py-4 text-center">Status de Acesso</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {members.length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-12 text-center text-slate-500 flex flex-col items-center">
                                    <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">group_off</span>
                                    Nenhum membro encontrado.
                                </td>
                            </tr>
                        )}
                        {members.map((member) => (
                        <tr key={member.id} className={`group transition-colors ${!member.is_active ? 'bg-slate-50 dark:bg-slate-900/40 opacity-75 grayscale-[0.5]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 border ${member.is_active ? 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600' : 'bg-slate-100 dark:bg-slate-800 border-dashed border-slate-300'}`}>
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-slate-400">person</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{member.full_name}</p>
                                        <p className="text-xs text-slate-500">{member.email}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase border tracking-wide ${
                                    member.role === 'office' 
                                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800' 
                                        : member.role === 'advocate' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
                                        : member.role === 'trainee' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                        : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                }`}>
                                    {member.role === 'office' ? 'Dono' : member.job_title}
                                </span>
                            </td>
                            {isOfficeOwner && (
                                <td className="px-6 py-4 text-center">
                                    {member.role !== 'office' ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <button 
                                                onClick={() => toggleStatus(member.id, member.is_active)}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${member.is_active ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                title={member.is_active ? "Clique para Bloquear" : "Clique para Liberar"}
                                            >
                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${member.is_active ? 'translate-x-4' : 'translate-x-1'}`} />
                                            </button>
                                            <span className={`text-[10px] font-bold uppercase ${member.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                                                {member.is_active ? 'Ativo' : 'Bloqueado'}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs font-bold text-slate-400 uppercase flex items-center justify-center gap-1">
                                            <span className="material-symbols-outlined text-sm">lock</span> Admin
                                        </span>
                                    )}
                                </td>
                            )}
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>

                {/* Rodapé da Paginação */}
                {totalCount > 0 && (
                    <div className="mt-auto px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            Mostrando <b>{members.length}</b> de <b>{totalCount}</b> membros
                        </span>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all text-slate-600 dark:text-slate-400"
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 px-2">
                                Página {currentPage} de {totalPages}
                            </span>

                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all text-slate-600 dark:text-slate-400"
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>

      {/* Modal de Cadastro (Mantido Igual) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-card-dark w-full max-w-2xl rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
                
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-card-dark z-10 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">verified_user</span>
                            Novo Membro
                        </h2>
                    </div>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Coluna Esquerda: Form */}
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
                            <input 
                                type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5 outline-none focus:ring-2 focus:ring-primary transition-all"
                                placeholder="Ex: Ana Silva"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail Profissional</label>
                            <input 
                                type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                                className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5 outline-none focus:ring-2 focus:ring-primary transition-all"
                                placeholder="ana@escritorio.com"
                            />
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                            <p className="text-xs text-blue-800 dark:text-blue-300 font-bold mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">key</span> Credenciais de Acesso
                            </p>
                            <div className="bg-white dark:bg-slate-900/50 p-2 rounded border border-blue-200 dark:border-blue-800/50 flex justify-between items-center">
                                <span className="text-xs text-slate-500">Senha Padrão:</span>
                                <code className="text-sm font-mono font-bold text-primary">{DEFAULT_PASSWORD}</code>
                            </div>
                            <p className="text-[10px] text-blue-600/80 dark:text-blue-400 mt-2">
                                O usuário poderá alterar esta senha no primeiro acesso.
                            </p>
                        </div>
                    </div>

                    {/* Coluna Direita: Seleção Visual */}
                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nível de Permissão</label>
                        
                        <div className="space-y-3">
                            {ACCESS_LEVELS.map((level) => (
                                <div 
                                    key={level.id}
                                    onClick={() => setSelectedRole(level.id)}
                                    className={`cursor-pointer rounded-xl p-3 border-2 transition-all relative overflow-hidden ${
                                        selectedRole === level.id 
                                            ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md ring-1 ring-primary/20' 
                                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-70 hover:opacity-100'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${level.color}`}>
                                            {level.label}
                                        </span>
                                        {selectedRole === level.id && <span className="material-symbols-outlined text-primary text-lg animate-in zoom-in">check_circle</span>}
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                                        {level.description}
                                    </p>
                                    
                                    <div className="grid grid-cols-2 gap-y-1 gap-x-2">
                                        {level.permissions.map((perm, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5">
                                                <div className={`size-1.5 rounded-full ${perm.allowed ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                                <span className={`text-[10px] font-medium ${perm.allowed ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 line-through decoration-slate-300'}`}>
                                                    {perm.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-card-dark">
                    <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors">Cancelar</button>
                    <button 
                        onClick={handleCreateUser} 
                        disabled={creating}
                        className="px-6 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 transition-all transform active:scale-95 shadow-lg shadow-primary/20"
                    >
                        {creating ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">person_add</span>}
                        {creating ? 'Processando...' : 'Confirmar Cadastro'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Team;