import { GoogleGenAI } from "@google/genai";
import { AgentContext, AgentResponse, IAgent } from "../../types";

export class RuralAgent implements IAgent {
  name = "Agente Especialista em Direito Previdenciário Rural";
  description = "Especializado em segurados especiais, agricultores, pescadores e indígenas.";

  // MUDANÇA IMPORTANTE: De 'private' para 'public'
  public getPromptForDocType(docType: string, context: AgentContext): string {
    const lowerType = docType.toLowerCase();
    
    // Bloco de leis encontradas na pesquisa
    const legalContextBlock = context.legalContext 
      ? `\n=== SUBSÍDIO JURÍDICO (PESQUISA RECENTE) ===\nUtilize obrigatoriamente estas fontes encontradas:\n${context.legalContext}\n====================================\n` 
      : "";

    // 1. Lógica para PETIÇÃO INICIAL
    if (lowerType.includes('inicial') || lowerType.includes('ação')) {
      return `
        ATUE COMO: Advogado Especialista em Direito Previdenciário Rural.
        TAREFA: Redigir PETIÇÃO INICIAL para ${context.clientName}.
        OBJETO: ${context.details}
        ${legalContextBlock}

        DIRETRIZES ESTRATÉGICAS:
        1. DOS FATOS: 
           - Detalhar a vida rurícola em regime de economia familiar.
           - Listar o "Início de Prova Material" (Docs em nome do autor ou pais/cônjuge).
           - Mencionar a Autodeclaração Rural homologada (se houver).
        2. DO DIREITO:
           - Fundamentar Art. 48, §1º da Lei 8.213/91 (Idade Rural) ou Híbrida.
           - Citar Súmula 149 do STJ (Prova testemunhal corroborando a documental).
           - Defender a inexigibilidade de contribuição previdenciária direta (Funrural).
           - INTEGRAR o subsídio jurídico fornecido acima (se houver).
        3. DOS PEDIDOS: Tutela de urgência (se houver risco), procedência total.
      `;
    }

    // 2. Lógica para RECURSOS
    if (lowerType.includes('recurso')) {
      return `
        ATUE COMO: Advogado Recursal Previdenciário (Rural).
        TAREFA: Redigir ${docType}.
        CASO: ${context.details}
        ${legalContextBlock}

        ESTRATÉGIA RECURSAL:
        1. PRELIMINAR: Cerceamento de defesa (se não ouviram testemunhas indispensáveis - Súmula 577 STJ).
        2. MÉRITO:
           - Reafirmar que a descontinuidade do trabalho rural não descaracteriza a condição de segurado especial.
           - Combater a tese de "descaracterização pelo trabalho urbano de membro familiar" (Tema 532 STJ).
           - Citar precedentes da TNU favoráveis ao trabalhador rural (use a pesquisa fornecida).
      `;
    }

    // 3. Lógica para RÉPLICA
    if (lowerType.includes('réplica') || lowerType.includes('contestação')) {
      return `
        ATUE COMO: Advogado Previdenciarista.
        TAREFA: Redigir RÉPLICA À CONTESTAÇÃO do INSS.
        CASO: ${context.details}
        ${legalContextBlock}
        
        PONTOS DE ATAQUE:
        - Refutar a alegação genérica de falta de provas.
        - Defender a validade dos documentos apresentados como início de prova material.
        - Requerer a produção de prova testemunhal para corroborar o período.
      `;
    }

    // 4. Default
    return `
      ATUE COMO: Advogado Previdenciarista Rural.
      TAREFA: Redigir "${docType}" para o cliente ${context.clientName}.
      DETALHES: ${context.details}
      ${legalContextBlock}
      OBS: Mantenha o foco na proteção do trabalhador rural (segurado especial) e use as leis pesquisadas.
    `;
  }

  async execute(context: AgentContext): Promise<AgentResponse> {
    // Este método agora é secundário, pois o Orquestrador cuida da execução.
    // Mantemos apenas para compatibilidade com a interface IAgent.
    return { content: "Execute via Orquestrador para Streaming." };
  }
}