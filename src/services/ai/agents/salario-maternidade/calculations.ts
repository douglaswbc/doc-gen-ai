// src/services/ai/agents/salario-maternidade/calculations.ts

import { AgentCalculations } from '../base/types';
import { generatePaymentTable } from '../../../salaryAdjustmentService';

/**
 * Cálculos específicos do agente de Salário Maternidade
 */
export const calculations: AgentCalculations = {
    calculate: (clientData: any) => {
        // Se não tiver data de nascimento da criança, retorna vazio
        if (!clientData.child_birth_date) {
            console.warn('Data de nascimento da criança não fornecida');
            return {};
        }

        try {
            // Calcula tabela de pagamentos com 4 meses
            const paymentTable = generatePaymentTable(clientData.child_birth_date, 4);

            console.log('📊 Tabela de pagamentos calculada:', paymentTable);

            return {
                paymentTable
            };
        } catch (error) {
            console.error('Erro ao calcular tabela de pagamentos:', error);
            return {};
        }
    }
};
