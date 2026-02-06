import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Profile, Office, UserRole } from '../types';
import { useUsageStats } from './useUsageStats';

export interface OfficeWithLimits extends Office {
  plan: string;
  documents_generated: number;
  documents_limit: number;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          office:offices (
            id, name, address, phone, website,
            plan, documents_limit, documents_generated, plan_status,
            cnpj, email, logo_url, secondary_phone,
            city, state, zip_code, slogan, footer_text, header_color
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const formattedProfile = {
        ...data,
        office: Array.isArray(data.office) ? data.office[0] : data.office
      };

      setProfile(formattedProfile as Profile);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const { usage, isLimitReached, incrementUsage } = useUsageStats(profile, fetchProfile, setProfile);

  const role = profile?.role as UserRole;

  const permissions = {
    canManageTeam: role === 'admin' || role === 'office',
    canManageOffice: role === 'admin' || role === 'office',
    canViewDocuments: true,
    canCreateDocuments: ['admin', 'office', 'advocate', 'trainee'].includes(role),
    canDeleteDocuments: ['admin', 'office', 'advocate'].includes(role),
    canSignDocuments: ['admin', 'office', 'advocate'].includes(role),
    canManageClients: ['admin', 'office', 'advocate', 'assistant'].includes(role),
    canDeleteClients: ['admin', 'office'].includes(role),
    needsOAB: ['office', 'advocate'].includes(role),
  };


  // Atualiza Perfil do Usuário
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date() })
        .eq('id', user.id);

      if (error) throw error;

      // Atualiza estado local e Auth cache
      setProfile(prev => prev ? { ...prev, ...updates } : null);

      // Atualiza metadados do Auth apenas se mudou nome ou avatar
      if (updates.full_name || updates.avatar_url) {
        await supabase.auth.updateUser({
          data: {
            full_name: updates.full_name || profile?.full_name,
            avatar_url: updates.avatar_url || profile?.avatar_url
          }
        });
      }

      toast.success('Perfil atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil.');
      throw error;
    }
  };

  // Atualiza Dados do Escritório (Apenas Dono)
  const updateOffice = async (officeId: string, updates: Partial<Office>) => {
    if (!user || !permissions.canManageOffice) return;
    try {
      const { error } = await supabase
        .from('offices')
        .update(updates)
        .eq('id', officeId);

      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        office: { ...prev.office!, ...updates }
      } : null);

      toast.success('Dados do escritório salvos!');
    } catch (error) {
      toast.error('Erro ao atualizar escritório.');
    }
  };

  // === FUNÇÕES DE AVATAR (Restauradas) ===
  const uploadAvatar = async (file: File) => {
    if (!user) return;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Atualiza usando a nova assinatura (passando objeto parcial)
      await updateProfile({ avatar_url: data.publicUrl });

    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar imagem.');
    }
  };

  const removeAvatar = async () => {
    if (!user) return;
    try {
      // Atualiza usando a nova assinatura (passando objeto parcial)
      await updateProfile({ avatar_url: null });
      toast.info('Foto removida.');
    } catch (error) {
      toast.error('Erro ao remover foto.');
    }
  };

  return {
    profile,
    loading,
    fetchProfile,
    updateProfile,
    updateOffice,
    uploadAvatar,
    permissions,
    isAdmin: role === 'admin',
    isOfficeOwner: role === 'office',
    usage,
    isLimitReached,
    incrementUsage
  };
};