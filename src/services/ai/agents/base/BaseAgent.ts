// src/services/ai/agents/base/BaseAgent.ts

import { Agent, AgentConfig, AgentTemplate, AgentCalculations } from './types';

/**
 * Classe abstrata base para todos os agentes
 * Fornece métodos utilitários comuns
 */
export abstract class BaseAgent implements Agent {
    /** Configuração do agente (deve ser implementada pela subclasse) */
    abstract config: AgentConfig;

    /** Template do agente (deve ser implementado pela subclasse) */
    abstract template: AgentTemplate;

    /** Cálculos específicos (opcional) */
    calculations?: AgentCalculations;

    /**
     * Valida se os dados do cliente contêm todos os campos obrigatórios
     */
    validate(clientData: any): boolean {
        for (const field of this.config.requiredFields) {
            if (!clientData[field] || clientData[field] === '') {
                console.warn(`Campo obrigatório ausente: ${field}`);
                return false;
            }
        }
        return true;
    }

    /**
     * Formata uma data para o padrão brasileiro
     */
    protected formatDate(dateStr: string): string {
        if (!dateStr) return '...';
        try {
            if (dateStr.includes('/')) return dateStr;
            const date = new Date(dateStr);
            return isNaN(date.getTime())
                ? dateStr
                : date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        } catch (e) {
            return dateStr;
        }
    }

    /**
     * Formata um valor monetário para o padrão brasileiro
     */
    protected formatMoney(val: number | string): string {
        if (!val) return 'R$ 0,00';
        const num = typeof val === 'string'
            ? parseFloat(val.replace(/[^\d,-]/g, '').replace(',', '.'))
            : val;
        return (isNaN(num) ? 0 : num).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    /**
     * Calcula a idade a partir de uma data de nascimento
     */
    protected calculateAge(birthDate: string): string {
        if (!birthDate) return '';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return `${age} anos`;
    }

    /**
     * Cria checkbox marcado ou desmarcado
     */
    protected check(val: boolean): string {
        return val ? "X" : "&nbsp;&nbsp;";
    }

    /**
     * Retorna informações sobre o agente
     */
    getInfo(): { name: string; type: string; description: string } {
        return {
            name: this.config.name,
            type: this.config.type,
            description: this.config.description
        };
    }
}
