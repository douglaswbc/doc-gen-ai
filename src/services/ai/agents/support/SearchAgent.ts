// src/services/ai/agents/support/SearchAgent.ts

const SERPER_API_KEY = import.meta.env.VITE_SERPER_API_KEY; // Adicione no seu .env

export const searchINSSAddress = async (userAddress: string): Promise<string> => {
  try {
    // 1. Extrai Cidade/UF do endereço da cliente para a busca ser precisa
    // Ex: "Rua X, Bairro Y, Santarém - PA" -> Busca: "Endereço INSS Santarém PA"

    // Uma limpeza simples para pegar o final do endereço onde geralmente fica a cidade
    const queryLocation = userAddress.split(',').slice(-2).join(' ') || userAddress;

    const query = `endereço agência INSS previdencia social mais próxima ${queryLocation}`;

    const response = await fetch('https://google.serper.dev/places', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        gl: 'br', // Região Brasil
        hl: 'pt-br' // Idioma Português
      })
    });

    const data = await response.json();

    // 2. Tenta pegar o endereço do "Knowledge Graph" (aquele quadro lateral do Google)
    if (data.knowledgeGraph && data.knowledgeGraph.description) {
      // As vezes o endereço vem na descrição ou atributos
      return data.knowledgeGraph.description;
    }

    if (data.knowledgeGraph && data.knowledgeGraph.attributes) {
      // O Serper costuma retornar "Address" ou "Endereço" nos atributos
      const addressAttr = data.knowledgeGraph.attributes.find((a: any) =>
        a.key.toLowerCase().includes('address') || a.key.toLowerCase().includes('endereço')
      );
      if (addressAttr) return addressAttr.value;
    }

    // 3. Se não tiver Knowledge Graph, pega o primeiro snippet orgânico (Places)
    if (data.places && data.places.length > 0) {
      return `${data.places[0].title} - ${data.places[0].address}`;
    }

    // 4. Fallback: Retorna um genérico se falhar
    return "Endereço a ser confirmado na citação (Busca automática falhou)";

  } catch (error) {
    console.error("Erro ao buscar INSS:", error);
    return "Agência da Previdência Social (Endereço a confirmar)";
  }
};

// ========================================
// BUSCA DE JURISPRUDÊNCIA
// ========================================

export interface JurisprudenceResult {
  title: string;
  snippet: string;
  link?: string;
  publication?: string;
  cited_by?: number;
}

/**
 * Busca jurisprudência relevante usando Google Scholar via Serper API
 * @param caseType - Tipo de caso (ex: "salário maternidade rural")
 * @param keywords - Palavras-chave adicionais para refinar a busca
 * @returns Array de jurisprudências encontradas
 */
export const searchJurisprudence = async (
  caseType: string,
  keywords: string[] = []
): Promise<JurisprudenceResult[]> => {
  try {
    console.log(`🔍 Buscando jurisprudência para: ${caseType}`);

    // Monta query otimizada para jurisprudência brasileira
    const tribunals = ['STF', 'STJ', 'TNU', 'TRF'];
    const keywordStr = keywords.length > 0 ? keywords.join(' ') : '';
    const query = `${caseType} ${keywordStr} ${tribunals.join(' OR ')} Brasil`;

    const response = await fetch('https://google.serper.dev/scholar', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        gl: 'br',
        hl: 'pt-br',
        num: 10 // Busca até 10 resultados
      })
    });

    if (!response.ok) {
      console.error(`Erro na API Serper: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Extrai resultados orgânicos do Scholar
    if (data.organic && Array.isArray(data.organic)) {
      const results: JurisprudenceResult[] = data.organic
        .filter((item: any) => {
          // Filtra apenas resultados que mencionam tribunais brasileiros
          const text = `${item.title} ${item.snippet}`.toLowerCase();
          return tribunals.some(t => text.includes(t.toLowerCase()));
        })
        .slice(0, 6) // Limita a 6 resultados mais relevantes
        .map((item: any) => ({
          title: item.title || 'Sem título',
          snippet: item.snippet || '',
          link: item.link,
          publication: item.publication,
          cited_by: item.inline_links?.cited_by?.total
        }));

      console.log(`✅ Encontradas ${results.length} jurisprudências relevantes`);
      return results;
    }

    console.warn('⚠️ Nenhuma jurisprudência encontrada');
    return [];

  } catch (error) {
    console.error("❌ Erro ao buscar jurisprudência:", error);
    return []; // Retorna array vazio em caso de erro (não-bloqueante)
  }
};
