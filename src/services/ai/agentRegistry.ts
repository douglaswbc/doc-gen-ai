// src/services/ai/agentRegistry.ts

import { Agent } from './agents/base/types';

/**
 * Registro central de todos os agentes disponíveis
 * Permite adicionar e buscar agentes por tipo
 */
class AgentRegistry {
    private agents: Map<string, Agent> = new Map();

    /**
     * Registra um novo agente
     * @param agent - Agente a ser registrado
     */
    register(agent: Agent): void {
        if (this.agents.has(agent.config.type)) {
            console.warn(`Agente ${agent.config.type} já está registrado. Sobrescrevendo...`);
        }
        this.agents.set(agent.config.type, agent);
        console.log(`✅ Agente registrado: ${agent.config.name} (${agent.config.type})`);
    }

    /**
     * Busca um agente por tipo
     * @param type - Tipo do agente
     * @returns Agente encontrado ou undefined
     */
    get(type: string): Agent | undefined {
        const agent = this.agents.get(type);
        if (!agent) {
            console.error(`❌ Agente não encontrado: ${type}`);
            console.log(`Agentes disponíveis: ${Array.from(this.agents.keys()).join(', ')}`);
        }
        return agent;
    }

    /**
     * Retorna todos os agentes registrados
     * @returns Array com todos os agentes
     */
    getAll(): Agent[] {
        return Array.from(this.agents.values());
    }

    /**
     * Retorna informações sobre todos os agentes
     * @returns Array com informações resumidas
     */
    getAllInfo(): Array<{ name: string; type: string; description: string }> {
        return this.getAll().map(agent => ({
            name: agent.config.name,
            type: agent.config.type,
            description: agent.config.description
        }));
    }

    /**
     * Verifica se um agente está registrado
     * @param type - Tipo do agente
     * @returns true se registrado, false caso contrário
     */
    has(type: string): boolean {
        return this.agents.has(type);
    }

    /**
     * Remove um agente do registro
     * @param type - Tipo do agente
     */
    unregister(type: string): boolean {
        return this.agents.delete(type);
    }

    /**
     * Retorna o número de agentes registrados
     */
    count(): number {
        return this.agents.size;
    }
}

// Exporta instância singleton
export const agentRegistry = new AgentRegistry();

// ========================================
// REGISTRO DE AGENTES
// ========================================

import { salarioMaternidadeAgent } from './agents/salario-maternidade';

// Registra agentes disponíveis
agentRegistry.register(salarioMaternidadeAgent);

// Exporta classe para testes
export { AgentRegistry };
