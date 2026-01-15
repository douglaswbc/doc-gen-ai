// src/services/ai/agents/support/reviewerAgent.ts
import { GoogleGenAI } from "@google/genai";
import { AgentContext, AgentResponse, IAgent } from "../../types";

export class ReviewerAgent implements IAgent {
  name = "Agente de Revisão e Controle de Qualidade";
  description = "Verifica consistência, ortografia e tom jurídico.";

  async execute(context: AgentContext, initialContent?: string): Promise<AgentResponse> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key não encontrada");
    const ai = new GoogleGenAI({ apiKey });

    // Se não tiver conteúdo para revisar, não faz nada (ou gera erro)
    if (!initialContent) return { content: "" };

    const prompt = `
      Você é um Agente Sênior de Revisão Jurídica (Camada 2).
      
      Sua tarefa: Analisar e MELHORAR a seguinte peça jurídica gerada por outro agente.
      
      Critérios de Revisão (Baseado no Manual de Qualidade):
      1. Verifique a consistência interna (datas, nomes).
      2. Melhore a fundamentação jurídica se estiver fraca.
      3. Ajuste o tom para ser persuasivo e formal.
      4. Garanta que espaços reservados [COMO ESTE] estejam claros para preenchimento.

      Peça Original:
      """
      ${initialContent}
      """

      Retorne APENAS a peça jurídica melhorada e pronta para uso. Não inclua comentários conversacionais antes ou depois.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return { content: response.text || initialContent };
    } catch (error) {
      console.error("Erro no Agente Revisor:", error);
      return { content: initialContent }; // Em caso de erro, retorna o original
    }
  }
}