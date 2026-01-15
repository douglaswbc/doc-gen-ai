import { openAIService } from '../openAIService';
import { geminiService } from '../geminiService';
import { knowledgeService } from '../knowledgeService';
import { agentRegistry } from './agentRegistry';
import { ProcessAgentOptions } from './agents/base/types';

export type AIProvider = 'openai' | 'gemini';

function extractJSON(text: string): string {
  try {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return text.substring(firstBrace, lastBrace + 1);
    }
    return text;
  } catch (e) { return text; }
}

export const orchestratorService = {
  async processDemand(options: ProcessAgentOptions): Promise<any> {
    const { agentType, provider, variables, clientData, promptTemplate } = options;

    console.log(`🤖 Orchestrator: Processando via ${provider} com agente ${agentType}...`);

    try {
      const agent = agentRegistry.get(agentType);
      if (!agent) throw new Error(`Agente "${agentType}" não encontrado`);

      // 1. Cálculos e Validações
      if (agent.validate && !agent.validate(clientData)) {
        throw new Error(`Dados inválidos para o agente ${agent.config.name}`);
      }
      let calculatedData: any = {};
      if (agent.calculations?.calculate) {
        calculatedData = agent.calculations.calculate(clientData);
      }

      // 2. Contexto Legal
      const keywords = [...variables.docType.toLowerCase().split(' '), 'rural', 'salario', 'maternidade'].filter(k => k.length > 3);
      const retrievedContext = await knowledgeService.getContext(keywords);
      const defaultContext = "Lei 8.213/91, CF/88, TNU/STJ.";
      const finalLegalContext = retrievedContext || defaultContext;

      const completeVariables = {
        ...variables,
        ...calculatedData,
        clientName: clientData.name,
        legalContext: finalLegalContext
      };

      // 3. Montagem do Prompt Base
      let finalPrompt = promptTemplate
        .replace(/{{client_name}}/g, completeVariables.clientName)
        .replace(/{{doc_type}}/g, completeVariables.docType)
        .replace(/{{case_details}}/g, completeVariables.details)
        .replace(/{{legal_context}}/g, finalLegalContext);

      const jsonSchema = agent.config.jsonInstructions(completeVariables);

      // === ATIVAÇÃO DO MODO REVISOR (CRÍTICO PARA CORREÇÃO) ===
      finalPrompt += `
      
      ================================================================================
      ATENÇÃO: VOCÊ AGORA ATUA COMO UM REVISOR JURÍDICO SÊNIOR
      ================================================================================
      
      Sua tarefa PRINCIPAL é corrigir os erros de português e formalizar os dados inseridos pelo usuário.
      O usuário digitou dados crus e informais (ex: "salaro", "oitavu", "nao tem").
      
      REGRAS OBRIGATÓRIAS DE SAÍDA (JSON):
      
      1. CORREÇÃO GRAMATICAL NO CAMPO "dados_tecnicos":
         Você DEVE preencher o objeto "dados_tecnicos" com a versão culta e jurídica dos dados.
         - Se entrada for "salaro" -> Saída deve ser "Salário-Maternidade"
         - Se entrada for "oitavu mes" -> Saída deve ser "Oitavo mês de gestação"
         - Se entrada for "dus 12 anos" -> Saída deve ser "Desde os 12 anos de idade até a atualidade"
         - Se entrada for "nao tem" -> Saída deve ser "Não consta / Nunca possuiu"

      2. LISTA DE PROVAS ÚNICA E LIMPA ("lista_provas"):
         - Liste APENAS os documentos mencionados nos fatos.
         - NÃO repita documentos com nomes parecidos.
         - Se já listou "Certidão de Nascimento", NÃO liste "Documento de nascimento" novamente.
         - Máximo de 5 itens na lista.

      ESTRUTURA JSON ESPERADA:
      {
          ${jsonSchema.replace('{', '').replace('}', '')},
          
          "dados_tecnicos": {
              "motivo_indeferimento": "Texto corrigido e formal",
              "tempo_atividade": "Texto corrigido e formal",
              "periodo_rural_declarado": "Texto corrigido (ex: Desde os 12 anos...)",
              "ponto_controvertido": "Texto jurídico (ex: Qualidade de Segurado Especial)",
              "beneficio_anterior": "Texto corrigido (ex: Recebeu Salário-Maternidade em 2022)",
              "cnis_averbado": "Texto corrigido (ex: Não constam vínculos)",
              "vinculo_urbano": "Texto corrigido (ex: Nunca exerceu atividade urbana)",
              "profissao_formatada": "Texto corrigido (ex: Agricultora em regime de economia familiar)"
          }
      }
      
      RESPONDA APENAS COM O JSON. SEM TEXTO ANTES OU DEPOIS.
      `;

      if (!promptTemplate.includes('{{case_details}}')) {
        finalPrompt += `\n\n--- DADOS BRUTOS (PARA CORREÇÃO) ---\n${variables.details}`;
      }

      console.log(`🤖 Chamando ${provider}...`);
      let response = provider === 'openai' 
        ? await openAIService.generate(finalPrompt) 
        : await geminiService.generate(finalPrompt);

      // Extração Segura do JSON
      let cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      cleanJson = extractJSON(cleanJson);

      try {
        const parsedData = JSON.parse(cleanJson);
        
        return {
            ...parsedData,
            tabela_calculo: calculatedData.tabela_calculo || parsedData.tabela_calculo,
            valor_causa_extenso: calculatedData.valor_causa_extenso || parsedData.valor_causa_extenso
        };

      } catch (e) {
        console.error("❌ Erro parse JSON:", e);
        return { resumo_fatos: response, erro_parse: true };
      }

    } catch (error) {
      console.error('❌ Erro no Orchestrator:', error);
      throw error;
    }
  }
};