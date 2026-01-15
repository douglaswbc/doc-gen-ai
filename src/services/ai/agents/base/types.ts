// src/services/ai/agents/base/types.ts

/**
 * Tipos e interfaces base para todos os agentes
 */

// ========================================
// INTERFACES DE CONFIGURAÇÃO
// ========================================

/**
 * Configuração de um agente
 */
export interface AgentConfig {
    /** Nome legível do agente */
    name: string;

    /** Identificador único do tipo de agente */
    type: string;

    /** Descrição do que o agente faz */
    description: string;

    /** Campos obrigatórios do clientData */
    requiredFields: string[];

    /** Gera instruções JSON para a IA */
    jsonInstructions: (variables: AgentVariables) => string;
}

/**
 * Variáveis disponíveis para o agente
 */
export interface AgentVariables {
    clientName: string;
    docType: string;
    details: string;
    inssAddress: string;
    jurisprudence?: any[];
    childBirthDate?: string;
    legalContext?: string;
    [key: string]: any; // Permite campos adicionais específicos do agente
}

// ========================================
// INTERFACES DE TEMPLATE
// ========================================

/**
 * Template HTML do agente
 */
export interface AgentTemplate {
    /**
     * Renderiza o documento HTML
     * @param aiData - Dados retornados pela IA
     * @param clientData - Dados do cliente do formulário
     * @param officeData - Dados do escritório
     * @param signers - Lista de signatários
     * @param generatorInfo - Informações do usuário que gerou o documento
     */
    render: (
        aiData: any,
        clientData: any,
        officeData: any,
        signers: any[],
        generatorInfo?: { name: string; id: string }
    ) => string;
}

// ========================================
// INTERFACES DE CÁLCULOS
// ========================================

/**
 * Cálculos específicos do agente
 */
export interface AgentCalculations {
    /**
     * Executa cálculos específicos do agente
     * @param clientData - Dados do cliente
     * @returns Dados calculados que serão passados para a IA
     */
    calculate?: (clientData: any) => any;
}

// ========================================
// INTERFACE PRINCIPAL DO AGENTE
// ========================================

/**
 * Interface principal que todos os agentes devem implementar
 */
export interface Agent {
    /** Configuração do agente */
    config: AgentConfig;

    /** Template HTML do agente */
    template: AgentTemplate;

    /** Cálculos específicos (opcional) */
    calculations?: AgentCalculations;

    /**
     * Valida se os dados do cliente são suficientes
     * @param clientData - Dados do cliente
     * @returns true se válido, false caso contrário
     */
    validate?: (clientData: any) => boolean;
}

// ========================================
// TIPOS AUXILIARES
// ========================================

/**
 * Resultado do processamento de um agente
 */
export interface AgentProcessResult {
    /** Dados retornados pela IA */
    aiData: any;

    /** HTML renderizado */
    html: string;

    /** Dados calculados (se houver) */
    calculatedData?: any;
}

/**
 * Opções para processar demanda com agente
 */
export interface ProcessAgentOptions {
    /** Tipo do agente a ser usado */
    agentType: string;

    /** Provider de IA (openai ou gemini) */
    provider: 'openai' | 'gemini';

    /** Variáveis para o agente */
    variables: AgentVariables;

    /** Dados do cliente */
    clientData: any;

    /** Dados do escritório */
    officeData: any;

    /** Signatários */
    signers: any[];
}
