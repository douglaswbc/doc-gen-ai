// src/utils/templates/index.ts
import { template as salarioMaternidade } from './salarioMaternidade';

/**
 * Interface para os templates de documentos
 */
export interface AgentTemplate {
  render: (
    aiData: any,
    clientData: any,
    officeData: any,
    signers: any[],
    generatorInfo?: { name: string; id: string }
  ) => string;
}

/**
 * Mapeamento de agentes para seus respectivos templates.
 * A chave deve corresponder ao 'name' do agente no banco de dados (ou slug normalizado).
 */
export const templates: Record<string, AgentTemplate> = {
  // Ajustando para o nome exato vindo do SQL: "Salário Maternidade - Agricultora"
  'Salário Maternidade - Agricultora': salarioMaternidade,
  
  // Nomes de reserva/fallback para garantir maior compatibilidade
  'salario_maternidade': salarioMaternidade,
  'Salário Maternidade': salarioMaternidade,
};

/**
 * Retorna o template adequado para o agente, com fallback para o de maternidade.
 */
export function getTemplate(agentName: string): AgentTemplate {
  // Tenta encontrar pelo nome exato, depois por variações
  const template = templates[agentName] || 
                   templates['Salário Maternidade - Agricultora'];
  
  return template;
}
