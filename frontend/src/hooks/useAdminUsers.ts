import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { Profile } from './useProfile';
import { useAuth } from '../context/AuthContext'; // Importar Auth para saber quem sou eu

export const useAdminUsers = () => {
  const { user: currentUser } = useAuth(); // Pegar o usuário logado atual
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          office:offices (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Alterar Status do Escritório (Ativar/Suspender o plano do escritório todo)
  const toggleUserStatus = async (id: string, currentStatus: string, officeId?: string) => {
    if (!officeId) {
      toast.error("Este usuário não está vinculado a um escritório.");
      return;
    }

    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const { error } = await supabase
        .from('offices')
        .update({ plan_status: newStatus })
        .eq('id', officeId);

      if (error) throw error;

      toast.success(`Escritório ${newStatus === 'active' ? 'ativado' : 'suspenso'}!`);
      // Atualiza localmente todos os usuários daquele escritório
      setUsers(users.map(u => u.office_id === officeId ? {
        ...u,
        office: u.office ? { ...u.office, plan_status: newStatus } : null,
        plan_status: newStatus // Mantém paridade visual
      } : u));
    } catch (error) {
      toast.error('Erro ao alterar status do escritório.');
    }
  };

  // Alterar Limite de Documentos do Escritório
  const updateUserLimit = async (officeId: string, newLimit: number) => {
    try {
      const { error } = await supabase
        .from('offices')
        .update({ documents_limit: newLimit })
        .eq('id', officeId);

      if (error) throw error;

      toast.success('Limite do escritório atualizado!');
      setUsers(users.map(u => u.office_id === officeId ? {
        ...u,
        office: u.office ? { ...u.office, documents_limit: newLimit } : null,
        documents_limit: newLimit // Mantém paridade visual
      } : u));
    } catch (error) {
      toast.error('Erro ao atualizar limite do escritório.');
    }
  };

  // Promover/Rebaixar Admin
  const toggleAdminRole = async (id: string, currentRole: string) => {
    // 🔒 PROTEÇÃO: Não permite remover o próprio admin
    if (currentUser?.id === id) {
      toast.warn("Segurança: Você não pode remover seu próprio acesso de administrador.");
      return;
    }

    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Tem certeza que deseja mudar o papel deste usuário para ${newRole}?`)) return;

    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
      if (error) throw error;
      toast.success(`Função alterada para ${newRole}`);
      // Atualiza lista localmente
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch (err) {
      toast.error('Erro ao alterar função.');
    }
  };

  // === NOVA FUNÇÃO: DELETAR USUÁRIO ===
  const deleteUser = async (id: string) => {
    // 🔒 PROTEÇÃO: Não permite se auto-deletar
    if (currentUser?.id === id) {
      toast.error("Segurança: Você não pode excluir seu próprio perfil enquanto está logado.");
      return;
    }

    // Confirmação dupla para evitar acidentes
    if (!window.confirm("⚠️ ATENÇÃO: Isso excluirá PERMANENTEMENTE o perfil do usuário e revogará o acesso imediatamente.\n\nDeseja continuar?")) return;

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;

      toast.success('Perfil excluído com sucesso.');
      // Remove o usuário da lista local para atualizar a tela sem recarregar
      setUsers(users.filter(u => u.id !== id));
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir usuário. Verifique suas permissões.');
    }
  };

  // Não esqueça de adicionar 'deleteUser' no retorno
  return { users, loading, fetchUsers, toggleUserStatus, updateUserLimit, toggleAdminRole, deleteUser };
};