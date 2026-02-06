import React, { useState, useMemo } from 'react';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { useNavigate } from 'react-router-dom';

const AdminUsers: React.FC = () => {
  const { users, loading, toggleUserStatus, updateUserLimit, toggleAdminRole, deleteUser } = useAdminUsers();
  const navigate = useNavigate();

  // Estado para controle de edição de limite
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempLimit, setTempLimit] = useState<number>(0);

  // Estados para expandir/colapsar escritórios
  const [expandedOffices, setExpandedOffices] = useState<Set<string>>(new Set());

  // Agrupar usuários por escritório
  const officeGroups = useMemo(() => {
    const groups: Record<string, { office: any; owner: any; members: any[] }> = {};

    // Primeiro, identificar os donos de escritório (role: office)
    users.forEach(user => {
      if (user.role === 'office' && user.office_id) {
        if (!groups[user.office_id]) {
          groups[user.office_id] = {
            office: user.office,
            owner: user,
            members: []
          };
        } else {
          groups[user.office_id].owner = user;
        }
      }
    });

    // Depois, adicionar os membros aos escritórios
    users.forEach(user => {
      if (user.role !== 'office' && user.role !== 'admin' && user.office_id) {
        if (groups[user.office_id]) {
          groups[user.office_id].members.push(user);
        }
      }
    });

    return Object.entries(groups).sort((a, b) =>
      (a[1].office?.name || '').localeCompare(b[1].office?.name || '')
    );
  }, [users]);

  // Estatísticas gerais baseadas em escritórios
  const stats = useMemo(() => {
    const offices = officeGroups.length;
    const totalUsers = users.filter(u => u.role !== 'admin').length;
    // Usuários ativos são aqueles cujos escritórios estão ativos
    const activeUsers = users.filter(u => u.office?.plan_status === 'active' && u.role !== 'admin').length;

    // Total de documentos agora é a soma dos gerados por cada escritório (único)
    const uniqueOffices = Array.from(new Set(users.map(u => u.office_id).filter(Boolean)));
    const totalDocs = uniqueOffices.reduce((sum, oid) => {
      const u = users.find(user => user.office_id === oid);
      return sum + (u?.office?.documents_generated || 0);
    }, 0);

    return { offices, totalUsers, activeUsers, totalDocs };
  }, [users, officeGroups]);

  const toggleOffice = (officeId: string) => {
    setExpandedOffices(prev => {
      const next = new Set(prev);
      if (next.has(officeId)) next.delete(officeId);
      else next.add(officeId);
      return next;
    });
  };

  const startEditing = (id: string, currentLimit: number) => {
    setEditingId(id);
    setTempLimit(currentLimit);
  };

  const saveLimit = (officeId: string) => {
    updateUserLimit(officeId, tempLimit);
    setEditingId(null);
  };

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      'office': { label: 'Dono', color: 'bg-primary/10 text-primary border-primary/20' },
      'advocate': { label: 'Advogado', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      'trainee': { label: 'Estagiário', color: 'bg-amber-100 text-amber-700 border-amber-200' },
      'assistant': { label: 'Assistente', color: 'bg-pink-100 text-pink-700 border-pink-200' },
      'admin': { label: 'Admin', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    };
    const badge = badges[role] || { label: role, color: 'bg-slate-100 text-slate-600 border-slate-200' };
    return (
      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <button onClick={() => navigate('/dashboard')} className="text-sm text-slate-500 hover:text-primary mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Voltar
            </button>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Gestão de Escritórios</h1>
            <p className="text-slate-500">Gerencie planos e limites centralizados por escritório.</p>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-500 uppercase">Escritórios</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.offices}</p>
          </div>
          <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-500 uppercase">Usuários Totais</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalUsers}</p>
          </div>
          <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-500 uppercase">Contas Ativas</p>
            <p className="text-2xl font-black text-green-600">{stats.activeUsers}</p>
          </div>
          <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-500 uppercase">Total Docs (Escritórios)</p>
            <p className="text-2xl font-black text-primary">{stats.totalDocs}</p>
          </div>
        </div>

        {/* Lista de Escritórios */}
        {loading ? (
          <div className="flex justify-center p-10">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          </div>
        ) : officeGroups.length === 0 ? (
          <div className="text-center p-10 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300">
            Nenhum escritório encontrado.
          </div>
        ) : (
          <div className="space-y-4">
            {officeGroups.map(([officeId, group]) => {
              const isExpanded = expandedOffices.has(officeId);
              const totalMembers = group.members.length + 1; // +1 para o dono
              const officeData = group.owner?.office;

              return (
                <div key={officeId} className="bg-white dark:bg-[#161b22] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">

                  {/* Header do Escritório */}
                  <button
                    onClick={() => toggleOffice(officeId)}
                    className={`w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left ${isExpanded ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined">business</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{officeData?.name || 'Escritório sem nome'}</h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">group</span>
                            {totalMembers} membro{totalMembers > 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">description</span>
                            {officeData?.documents_generated || 0} / {officeData?.documents_limit || 0} total
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${officeData?.plan_status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                            }`}>
                            {officeData?.plan === 'trial' ? 'Trial' : officeData?.plan || 'Free'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  {/* Conteúdo Expandido */}
                  {isExpanded && (
                    <div className="p-4 animate-in slide-in-from-top-2 duration-200">

                      {/* Gestão do Plano do Escritório */}
                      <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Assinatura do Escritório</p>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black text-slate-900 dark:text-white">Plano {officeData?.plan?.toUpperCase()}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${officeData?.plan_status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {officeData?.plan_status === 'active' ? 'Ativo' : 'Suspenso'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-xs text-slate-400 uppercase font-bold">Limite de Documentos</p>
                              {editingId === officeId ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <input
                                    type="number"
                                    value={tempLimit}
                                    onChange={(e) => setTempLimit(Number(e.target.value))}
                                    className="w-20 px-2 py-1 text-sm border border-primary rounded dark:bg-slate-900 dark:text-white"
                                    autoFocus
                                  />
                                  <button onClick={() => saveLimit(officeId)} className="bg-green-500 text-white p-1 rounded"><span className="material-symbols-outlined text-sm">check</span></button>
                                  <button onClick={() => setEditingId(null)} className="bg-slate-500 text-white p-1 rounded"><span className="material-symbols-outlined text-sm">close</span></button>
                                </div>
                              ) : (
                                <div
                                  className="flex items-center gap-2 cursor-pointer group mt-1"
                                  onClick={() => startEditing(officeId, officeData?.documents_limit || 0)}
                                >
                                  <p className="text-xl font-black text-primary">
                                    {officeData?.documents_generated || 0} / {officeData?.documents_limit || 0}
                                  </p>
                                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-sm">edit</span>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => toggleUserStatus(group.owner.id, officeData?.plan_status, officeId)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${officeData?.plan_status === 'active'
                                ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                                : 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white'
                                }`}
                            >
                              <span className="material-symbols-outlined text-sm">{officeData?.plan_status === 'active' ? 'block' : 'check_circle'}</span>
                              {officeData?.plan_status === 'active' ? 'Suspender Plano' : 'Ativar Plano'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Dono do Escritório */}
                      <div className="mb-4">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2 px-2">Proprietário</p>
                        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                              {group.owner?.avatar_url ? (
                                <img src={group.owner.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="material-symbols-outlined text-slate-400">person</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-sm">{group.owner?.full_name || 'Sem nome'}</p>
                              <p className="text-xs text-slate-500">{group.owner?.email}</p>
                            </div>
                            {getRoleBadge('office')}
                          </div>
                        </div>
                      </div>

                      {/* Membros do Escritório */}
                      {group.members.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-2 px-2">Equipe ({group.members.length})</p>
                          <div className="space-y-2">
                            {group.members.map(member => (
                              <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                  <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                    {member.avatar_url ? (
                                      <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="material-symbols-outlined text-sm text-slate-400">person</span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white text-sm">{member.full_name || 'Sem nome'}</p>
                                    <p className="text-xs text-slate-500">{member.email}</p>
                                  </div>
                                  {getRoleBadge(member.role)}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => deleteUser(member.id)}
                                      title="Remover do Escritório"
                                      className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-lg">person_remove</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {group.members.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">Nenhum membro cadastrado neste escritório.</p>
                      )}
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

export default AdminUsers;