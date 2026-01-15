import { GoogleGenAI } from "@google/genai";
import { AgentContext, AgentResponse, IAgent } from "../../types";

export class UrbanAgent implements IAgent {
  name = "Agente Especialista em Direito Previdenciário Urbano";
  description = "Especializado em aposentadorias (tempo/idade), benefícios por incapacidade e pensões para trabalhadores urbanos (CLT e Autônomos).";

  // MUDANÇA IMPORTANTE: De 'private' para 'public'
  public getPromptForDocType(docType: string, context: AgentContext): string {
    const isAppeal = docType.toLowerCase().includes('recurso');
    const isInitial = docType.toLowerCase().includes('petição inicial') || docType.toLowerCase().includes('ação');
    
    // Injeção do contexto pesquisado
    const legalContextBlock = context.legalContext 
      ? `\n=== SUBSÍDIO JURÍDICO (PESQUISA RECENTE) ===\nUtilize estas fontes para fundamentar:\n${context.legalContext}\n====================================\n` 
      : "";

    const baseContext = `
      ATUE COMO: Advogado Especialista em Direito Previdenciário (Foco: Regime Geral/Urbano).
      CLIENTE: ${context.clientName}
      CASO: ${context.details}
      ${legalContextBlock}
    `;

    if (isInitial) {
      return `
        ${baseContext}
        TAREFA: Redigir uma PETIÇÃO INICIAL de ${docType}.
        
        ESTRUTURA OBRIGATÓRIA:
        1. Dos Fatos: Narrar histórico laborativo urbano (empresas, cargos, períodos).
        2. Do Direito: 
           - Fundamentar com Lei 8.213/91 e Decreto 3.048/99.
           - Se for Aposentadoria Especial: Analisar PPP/LTCAT e agentes nocivos (Súmula Vinculante 33 STF).
           - Se for Benefício por Incapacidade: Focar na qualidade de segurado e carência (Art. 59 Lei 8.213/91).
           - Citar dados do CNIS e CTPS como prova plena.
           - Utilizar os precedentes encontrados na pesquisa (se houver).
        3. Dos Pedidos: Requerimentos finais claros (implantação do benefício, pagamentos retroativos).
      `;
    }

    if (isAppeal) {
      return `
        ${baseContext}
        TAREFA: Redigir um RECURSO (${docType}) contra decisão desfavorável.
        
        ESTRUTURA OBRIGATÓRIA:
        1. Da Tempestividade e Preparo.
        2. Das Razões Recursais:
           - Identificar onde o INSS ou Juízo errou na análise do tempo urbano ou carência.
           - Citar jurisprudência da TNU/TRF4 favorável ao segurado urbano (priorize o que foi pesquisado acima).
           - Contra-argumentar a "perda da qualidade de segurado" se for o caso.
      `;
    }

    return `
      ${baseContext}
      TAREFA: Redigir documento do tipo "${docType}".
      FOCO: Defender os interesses do segurado urbano, garantindo a correta averbação de vínculos e salários de contribuição conforme o CNIS.
    `;
  }

  async execute(context: AgentContext): Promise<AgentResponse> {
    // Este método agora é secundário, pois o Orquestrador cuida da execução.
    // Mantemos apenas para compatibilidade com a interface IAgent.
    return { content: "Execute via Orquestrador para Streaming." };
  }
}