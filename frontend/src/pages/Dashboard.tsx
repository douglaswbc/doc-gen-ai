import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useNavigation } from '../hooks/useNavigation';
import { supabase } from '../lib/supabase';
import UpgradeModal from '../components/UpgradeModal';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // AQUI: Extraímos 'usage' para pegar os dados do escritório (compartilhado)
    const { profile, permissions, usage, loading: profileLoading } = useProfile();

    const { availableModules, loading: navLoading } = useNavigation();

    const [clientCount, setClientCount] = useState<number | null>(null);
    const [recentDocs, setRecentDocs] = useState<any[]>([]);


    // Buscar contagem de clientes ativos (Só se tiver permissão de gerir clientes)
    useEffect(() => {
        const fetchClientCount = async () => {
            // Otimização: Não busca se não tiver permissão de ver clientes
            if (!user || !permissions.canManageClients) return;

            try {
                const { count, error } = await supabase
                    .from('clients')
                    .select('*', { count: 'exact', head: true })
                    // O RLS já filtra por escritório
                    .eq('status', 'active');

                if (!error) setClientCount(count || 0);
            } catch (err) {
                console.error('Erro ao contar clientes:', err);
            }
        };

        if (!profileLoading) {
            fetchClientCount();
            // Buscar últimos documentos
            const fetchRecentDocs = async () => {
                if (!user) return;
                try {
                    const { data, error } = await supabase
                        .from('documents')
                        .select('id, title, specialty, created_at')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(5);
                    if (!error && data) setRecentDocs(data);
                } catch (err) {
                    console.error('Erro ao buscar docs recentes:', err);
                }
            };
            fetchRecentDocs();
        }
    }, [user, profileLoading, permissions.canManageClients]);

    const moduleVisuals: Record<string, any> = {
        'Judicial': { icon: 'gavel', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', desc: 'Ações previdenciárias rurais e urbanas.' },
        'Administrativo': { icon: 'assignment_turned_in', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', desc: 'Requerimentos e recursos no INSS.' },
        'Corporativo': { icon: 'business_center', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', desc: 'Gestão jurídica para empresas.' }
    };

    const defaultKeys = ['Judicial', 'Administrativo', 'Corporativo'];
    const allModuleKeys = Array.from(new Set([...defaultKeys, ...availableModules]));

    if (profileLoading || navLoading) {
        return <div className="flex h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>;
    }

    return (
        <div className="flex flex-col items-center w-full min-h-full bg-slate-50 dark:bg-background-dark transition-colors duration-300">
            <div className="w-full max-w-[1280px] px-4 md:px-10 py-8">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
                            Olá, {profile?.full_name?.split(' ')[0] || 'Doutor(a)'}! 👋
                        </h1>
                        <p className="text-base font-normal text-gray-500 dark:text-gray-400">
                            Bem-vindo ao seu painel de inteligência jurídica.
                        </p>
                    </div>

                    {/* BOTÃO RÁPIDO: Só quem pode CRIAR (Advogado/Estagiário/Dono) */}
                    {permissions.canCreateDocuments && (
                        <Link to="/judicial" className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all">
                            <span className="material-symbols-outlined">add</span> Novo Documento Rápido
                        </Link>
                    )}
                </div>

                {/* STATS */}
                {profile && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 animate-in fade-in duration-700">

                        {/* Docs Gerados (USANDO OBJETO USAGE - COMPARTILHADO) */}
                        <div className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                            <div className="size-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                                <span className="material-symbols-outlined text-2xl">description</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                    {usage.generated}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Documentos da Equipe</p>
                            </div>
                        </div>

                        {/* Clientes Ativos (Visível apenas se tiver permissão) */}
                        {permissions.canManageClients ? (
                            <div className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                <div className="size-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <span className="material-symbols-outlined text-2xl">group</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                        {clientCount !== null ? clientCount : '-'}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Clientes Ativos</p>
                                </div>
                            </div>
                        ) : (
                            // Placeholder para quem não vê clientes (Estagiário)
                            <div className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 opacity-50">
                                <div className="size-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                    <span className="material-symbols-outlined text-2xl">lock</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Restrito</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Acesso a Clientes</p>
                                </div>
                            </div>
                        )}

                        {/* Plano e Upgrade (USANDO OBJETO USAGE) */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden md:col-span-1">
                            <div className="relative z-10 flex flex-col justify-between h-full gap-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold uppercase tracking-wider opacity-70">Plano do Escritório</span>
                                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold uppercase">{usage.plan}</span>
                                    </div>
                                    <h3 className="text-xl font-black">
                                        {usage.limit >= 999999
                                            ? 'Acesso Ilimitado'
                                            : `${Math.max(0, usage.limit - usage.generated)} docs restantes`
                                        }
                                    </h3>
                                </div>

                                {/* Botão Upgrade apenas para Dono (canManageOffice) */}
                                {permissions.canManageOffice && (
                                    <button
                                        onClick={() => setShowUpgradeModal(true)}
                                        className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors shadow-md flex items-center justify-center gap-2 mt-auto"
                                    >
                                        <span className="material-symbols-outlined text-base">rocket_launch</span>
                                        Fazer Upgrade
                                    </button>
                                )}
                            </div>
                            <div className="absolute -bottom-4 -right-4 opacity-10">
                                <span className="material-symbols-outlined text-8xl">workspace_premium</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ÚLTIMOS DOCUMENTOS */}
                {recentDocs.length > 0 && (
                    <div className="mb-8 animate-in fade-in duration-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">history</span>
                            Últimos Documentos
                        </h2>
                        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            {recentDocs.map((doc, index) => (
                                <Link
                                    key={doc.id}
                                    to="/my-documents"
                                    className={`flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${index !== recentDocs.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-slate-400">description</span>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white text-sm">{doc.title}</p>
                                            <p className="text-xs text-slate-500">{doc.specialty}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400">
                                            {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                                        </span>
                                        <span className="material-symbols-outlined text-slate-400 text-sm">chevron_right</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* MÓDULOS */}
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">grid_view</span>
                        Módulos de Atuação
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {allModuleKeys.map((modName, index) => {
                            const isAvailable = availableModules.includes(modName);
                            const visual = moduleVisuals[modName] || { icon: 'folder', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-slate-800', desc: 'Módulo personalizado.' };

                            const canAccess = isAvailable && permissions.canCreateDocuments;

                            return (
                                <Link
                                    key={modName}
                                    to={isAvailable ? `/modules/${modName}` : '#'}
                                    className={`group relative flex flex-col gap-4 rounded-2xl border p-6 transition-all duration-300 
                            ${canAccess
                                            ? 'bg-white dark:bg-card-dark border-gray-200 dark:border-gray-800 hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                                            : 'bg-gray-50 dark:bg-slate-900/50 border-gray-100 dark:border-slate-800 opacity-60 cursor-not-allowed grayscale'}`}
                                    onClick={(e) => !canAccess && e.preventDefault()}
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    {!isAvailable && (
                                        <div className="absolute top-4 right-4 bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-300 text-[10px] font-bold uppercase px-2 py-1 rounded-full">Em Breve</div>
                                    )}

                                    <div className={`size-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${canAccess ? (visual.bg + ' ' + visual.color) : 'bg-gray-200 dark:bg-slate-800 text-gray-400'}`}>
                                        <span className="material-symbols-outlined text-3xl">{visual.icon}</span>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors">{modName}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{visual.desc}</p>
                                    </div>

                                    {canAccess && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center text-primary font-bold text-sm opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                            Acessar Agora <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* === UPGRADE MODAL === */}
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                usage={usage}
            />
        </div>
    );
};

export default Dashboard;