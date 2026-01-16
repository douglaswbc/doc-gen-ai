import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface NavigationStructure {
  [module: string]: {
    [sphere: string]: any[]; // Lista de Agentes
  };
}

export const useNavigation = () => {
  const [structure, setStructure] = useState<NavigationStructure>({});
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNavigation = async () => {
      try {
        // Busca apenas agentes ATIVOS
        const { data: agents, error } = await supabase
          .from('ai_agents')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;

        // Organiza os dados: Módulo -> Esfera -> Lista de Agentes
        const nav: NavigationStructure = {};
        
        agents?.forEach(agent => {
          const mod = agent.module || 'Outros';
          const sph = agent.sphere || 'Geral';

          if (!nav[mod]) nav[mod] = {};
          if (!nav[mod][sph]) nav[mod][sph] = [];

          nav[mod][sph].push(agent);
        });

        setStructure(nav);
        setAvailableModules(Object.keys(nav));
      } catch (err) {
        console.error("Erro ao carregar navegação", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNavigation();
  }, []);

  return { structure, availableModules, loading };
};