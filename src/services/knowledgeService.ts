import { supabase } from '../lib/supabase';

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
}

export const knowledgeService = {
  /**
   * Busca itens de conhecimento baseados em palavras-chave (tags)
   * que coincidam com o nome do agente ou esfera.
   */
  async getContext(keywords: string[]): Promise<string> {
    try {
      if (keywords.length === 0) return "";

      // Normaliza as keywords para busca
      const searchTerms = keywords.map(k => k.toLowerCase().trim());

      // Busca itens que tenham ALGUMA das tags correspondentes
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('title, content')
        .eq('is_active', true)
        .overlaps('tags', searchTerms); // Verifica se há sobreposição de arrays

      if (error) throw error;

      if (!data || data.length === 0) return "";

      // Formata o retorno para ser injetado no Prompt
      const formattedContext = data.map(item => `
---
[${item.title.toUpperCase()}]
${item.content}
---`).join('\n');

      return formattedContext;

    } catch (error) {
      console.error("Erro ao buscar Knowledge Base:", error);
      return "";
    }
  }
};