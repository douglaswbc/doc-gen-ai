// src/services/ai/agents/salario-maternidade/config.ts

import { AgentConfig, AgentVariables } from '../base/types';

/**
 * Configuração do agente de Salário Maternidade Rural
 */
export const config: AgentConfig = {
    name: 'Salário Maternidade Rural',
    type: 'salario_maternidade',
    description: 'Ação previdenciária de concessão de salário maternidade para segurada especial (agricultora)',

    requiredFields: [
        'name',
        'child_name',
        'child_birth_date',
        'address',
        'cpf',
        'rg'
    ],

    jsonInstructions: (variables: AgentVariables) => {
        // Contexto de jurisprudência (se disponível)
        const jurisprudenceContext = variables.jurisprudence && variables.jurisprudence.length > 0
            ? `\n\nJURISPRUDÊNCIA DISPONÍVEL (selecione as 2-3 mais relevantes):\n${variables.jurisprudence.map((j: any, i: number) =>
                `${i + 1}. ${j.title}\n   ${j.snippet}`
            ).join('\n\n')}`
            : '';

        // Tabela de cálculo (se disponível)
        const paymentTableJson = variables.paymentTable
            ? JSON.stringify(variables.paymentTable, null, 2)
            : `[
           { "competencia": "1º Mês", "valor_base": 1518.00, "valor_reajustado": 1518.00 },
           { "competencia": "2º Mês", "valor_base": 1518.00, "valor_reajustado": 1518.00 },
           { "competencia": "3º Mês", "valor_base": 1518.00, "valor_reajustado": 1518.00 },
           { "competencia": "4º Mês", "valor_base": 1518.00, "valor_reajustado": 1518.00 }
        ]`;

        return `
      SAÍDA OBRIGATÓRIA: APENAS JSON VÁLIDO.
      Extraia/Gere os dados variáveis para preencher o template de Salário-Maternidade Rural.

      {
        "end_cidade_uf": "Cidade/UF da comarca competente (ex: Santarém-PA)",
        "inss_address": "${variables.inssAddress}",
        "prioridades": { 
            "idoso": boolean, 
            "deficiente": boolean, 
            "menor": boolean // true se a autora tiver < 18 anos
        },
        "resumo_fatos": "Narrativa persuasiva (3 parágrafos) descrevendo a lida rural da autora (economia familiar, culturas plantadas: milho, feijão, etc), o nascimento da criança e a negativa do INSS. Use tags <b> para destaques.",
        
        "lista_provas": [
            "Lista de 4 a 6 provas documentais específicas baseadas no relato (ex: ITR do sogro, Ficha de Sindicato, Notas Fiscais em nome do pai/marido). Não numere."
        ],

        "preliminares": "OBRIGATÓRIO: Gere TODAS as seções preliminares em HTML. SEMPRE inclua 'DA GRATUIDADE DA JUSTIÇA' com fundamentação única baseada na jurisprudência disponível (art. 5º LXXIV CF/88, Lei 1.060/50). ADICIONE outras preliminares se solicitado nos DETALHES do formulário (tutela de urgência, liminar, etc). Use formato: <p style='font-weight: bold;'>TÍTULO DA PRELIMINAR:</p><p>Texto fundamentado...</p>. Cada geração deve ter redação única e persuasiva.",
        
        "jurisprudencias_selecionadas": [
            // Selecione 2-3 jurisprudências mais relevantes da lista fornecida acima
            {
              "tribunal": "STF ou STJ ou TNU ou TRF",
              "ementa": "Resumo da decisão (máximo 2 linhas)",
              "referencia": "Título completo ou número do processo se disponível"
            }
        ],
        
        "valor_causa_extenso": "valor total por extenso",
        "tabela_calculo": ${paymentTableJson}
      }
      ${jurisprudenceContext}
    `;
    }
};
