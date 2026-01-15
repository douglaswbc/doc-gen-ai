import { supabase } from '../lib/supabase';
import { Profile } from '../types';

export const useUsageStats = (profile: Profile | null, fetchProfile: () => void) => {
    const usage = {
        plan: profile?.office?.plan || profile?.plan || 'free',
        generated: profile?.office?.documents_generated || profile?.documents_generated || 0,
        limit: profile?.office?.documents_limit || profile?.documents_limit || 5,
    };

    const isLimitReached = usage.generated >= usage.limit;

    const incrementUsage = async () => {
        if (!profile) return;

        try {
            if (profile.office_id) {
                const { error } = await supabase.rpc('increment_document_count', {
                    target_office_id: profile.office_id
                });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('profiles')
                    .update({ documents_generated: (profile.documents_generated || 0) + 1 })
                    .eq('id', profile.id);
                if (error) throw error;
            }
            fetchProfile();
        } catch (error) {
            console.error("Erro ao computar uso:", error);
        }
    };

    return { usage, isLimitReached, incrementUsage };
};
