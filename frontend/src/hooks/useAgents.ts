import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

export interface Agent {
  id: string;
  name: string;
  slug: string; // Adicionado para identificação robusta
  description: string;
  sphere: string;
  system_instruction: string;
  features: string[];
  is_active: boolean;
}

export const useAgents = (onlyActive = true) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ai_agents')
        .select('*')
        .order('name');

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Erro ao buscar agentes:', error);
      toast.error('Erro ao carregar agentes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [onlyActive]);

  const saveAgent = async (agent: Partial<Agent>) => {
    try {
      const { error } = await supabase.from('ai_agents').upsert(agent).select();
      if (error) throw error;
      toast.success('Agente salvo com sucesso!');
      fetchAgents();
      return true;
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar agente.');
      return false;
    }
  };

  const deleteAgent = async (id: string) => {
    if (!window.confirm('Tem certeza?')) return;
    try {
      const { error } = await supabase.from('ai_agents').delete().eq('id', id);
      if (error) throw error;
      toast.success('Agente removido.');
      fetchAgents();
    } catch (error) {
      toast.error('Erro ao deletar.');
    }
  };

  return { agents, loading, fetchAgents, saveAgent, deleteAgent };
};