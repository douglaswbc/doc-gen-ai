import { supabase } from '../lib/supabase';
import { Profile } from '../types';

export const useUsageStats = (
    profile: Profile | null,
    fetchProfile: () => void,
    setProfile?: React.Dispatch<React.SetStateAction<Profile | null>>
) => {
    // Agora o plano e créditos residem exclusivamente no Escritório (Office)
    const usage = {
        plan: profile?.office?.plan || 'free',
        generated: profile?.office?.documents_generated || 0,
        limit: profile?.office?.documents_limit || 5,
    };

    const isLimitReached = usage.generated >= usage.limit;

    const incrementUsage = async () => {
        if (!profile || !profile.office_id) {
            console.warn("Usuário sem escritório vinculado. Créditos não computados.");
            return;
        }

        try {
            // Sempre incrementa no escritório, independentemente de quem gerou (Sócio, Advogado ou Assistente)
            const { error } = await supabase.rpc('increment_document_count', {
                target_office_id: profile.office_id
            });

            if (error) throw error;

            // ATUALIZAÇÃO OTIMISTA: Sincroniza a UI localmente ANTES de esperar o fetch do banco
            if (setProfile) {
                setProfile(prev => {
                    if (!prev || !prev.office) return prev;
                    return {
                        ...prev,
                        office: {
                            ...prev.office,
                            documents_generated: (prev.office.documents_generated || 0) + 1
                        }
                    };
                });
            }

            fetchProfile();
        } catch (error) {
            console.error("Erro ao computar uso no escritório:", error);
        }
    };

    return { usage, isLimitReached, incrementUsage };
};
