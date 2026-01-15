// src/services/ai/agents/salario-maternidade/index.ts

import { BaseAgent } from '../base/BaseAgent';
import { config } from './config';
import { template } from './template';
import { calculations } from './calculations';

/**
 * Agente de Salário Maternidade Rural
 * Gera petições de ação previdenciária para seguradas especiais
 */
export class SalarioMaternidadeAgent extends BaseAgent {
    config = config;
    template = template;
    calculations = calculations;
}

// Exporta instância do agente
export const salarioMaternidadeAgent = new SalarioMaternidadeAgent();
