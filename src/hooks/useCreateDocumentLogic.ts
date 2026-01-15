import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDocumentGenerator } from './useDocumentGenerator';
import { useProfile } from './useProfile';
import { useAgents } from './useAgents';
import { ClientData, Signer } from '../types';
import { AIProvider } from '../services/ai/orchestrator';

// Importando serviços de busca e template
import { searchINSSAddress, searchJurisprudence } from '../services/ai/agents/support/SearchAgent';
import { template as salarioMaternidadeTemplate } from '../services/ai/agents/salario-maternidade/template'; 

export const useCreateDocumentLogic = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const { profile, fetchProfile, isLimitReached, incrementUsage } = useProfile();
    const { agents } = useAgents(true);
    
    const docGen = useDocumentGenerator();

    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState('Iniciando...');
    const [signers, setSigners] = useState<Signer[]>([]);
    const [selectedSignerIds, setSelectedSignerIds] = useState<string[]>([]);
    const [isSignerDropdownOpen, setIsSignerDropdownOpen] = useState(false);

    const [clientData, setClientData] = useState<ClientData>({
        name: '', nationality: 'Brasileira', marital_status: '', profession: 'Agricultora', birth_date: '', cpf: '', rg: '', rg_issuer: '', address: '',
        child_name: '', child_cpf: '', child_birth_date: '',
        der: '', nb: '', benefit_status: 'indeferido',
        denied_date: '', decision_reason: '', activity_before_birth: '', special_insured_period: '',
        controversial_point: '', previous_benefit: 'Não consta', cnis_period: 'Não consta', urban_link: 'Nunca teve',
        rural_start_date: '', rural_tasks: '',
        evidence_list: '', case_details: '', specific_details: ''
    });

    const [suggestions, setSuggestions] = useState<ClientData[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [docType, setDocType] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const initialAgentTitle = searchParams.get('type') || '';
    const tasksParam = searchParams.get('tasks');
    const sphereParam = searchParams.get('sphere');
    const availableTasks = tasksParam ? JSON.parse(decodeURIComponent(tasksParam)) : [];

    // === FUNÇÃO PRINCIPAL DE GERAÇÃO ===
    const generate = async (
        agentName: string, 
        docType: string, 
        clientName: string, 
        details: string, 
        provider: AIProvider, 
        systemInstruction: string
    ) => {
        try {
            setProgress(10);
            setProgressStatus('Buscando dados complementares (INSS, Jurisprudência)...');

            // 1. Enriquecimento de Dados (Search Agents)
            let inssAddress = "Endereço a ser citado";
            let rawJurisprudencias: any[] = [];

            try {
                // Executa buscas em paralelo para ganhar tempo
                const [addrResult, jurisResult] = await Promise.all([
                    searchINSSAddress(clientData.address),
                    searchJurisprudence("Salário-Maternidade Rural Segurada Especial STF ADI 2110")
                ]);
                
                inssAddress = addrResult;
                rawJurisprudencias = Array.isArray(jurisResult) ? jurisResult : [];
                
                console.log("📍 Endereço INSS:", inssAddress);
                console.log("⚖️ Jurisprudências brutas:", rawJurisprudencias.length);

            } catch (err) {
                console.warn("Aviso: Falha nas buscas automáticas (prosseguindo com defaults):", err);
            }

            setProgress(40);
            setProgressStatus('Processando Inteligência Artificial (Agente Revisor Ativo)...');

            // 2. Prepara dados para a IA
            const enrichedClientData = {
                ...clientData,
                inss_address: inssAddress
            };

            // 3. Chamada ao Gerador (Core)
            const aiResponse = await docGen.generate(
                'salario_maternidade', 
                docType,
                clientName,
                details, 
                provider,
                systemInstruction, 
                enrichedClientData 
            );

            setProgress(80);
            setProgressStatus('Montando documento final...');

            // 4. Montagem do HTML (Template) e Correção de Jurisprudência
            if (aiResponse) {
                if (typeof aiResponse === 'object' && !aiResponse.erro_parse) {
                    
                    // === ADAPTADOR DE JURISPRUDÊNCIA (CORREÇÃO DO UNDEFINED) ===
                    // Mapeia o resultado do Google Search para os campos que o Template espera
                    const mappedJurisprudencia = rawJurisprudencias.map(j => ({
                        tribunal: j.title || "Tribunal Superior", // Usa o título como tribunal se não houver
                        ementa: j.snippet || "Conteúdo indisponível", // Usa o snippet como ementa
                        referencia: j.link || "Fonte não informada" // Usa o link como referência
                    })).slice(0, 3); // Pega apenas as 3 melhores

                    // Mescla os dados finais
                    const finalAiData = {
                        ...aiResponse,
                        inss_address: inssAddress,
                        jurisprudencias_selecionadas: mappedJurisprudencia
                    };

                    const selectedSignersList = signers.filter(s => selectedSignerIds.includes(s.id));
                    
                    // Renderiza o template
                    const finalHtml = salarioMaternidadeTemplate.render(
                        finalAiData,
                        clientData,
                        profile?.office,
                        selectedSignersList
                    );
                    
                    docGen.setGeneratedContent(finalHtml);
                
                } else {
                    console.warn("IA retornou formato não estruturado. Exibindo texto bruto.");
                    if (aiResponse.resumo_fatos) {
                         docGen.setGeneratedContent(`<div style="padding:20px; color:red;"><h3>Erro na Formatação Automática</h3><p>Ocorreu um erro ao processar a resposta da IA.</p><pre>${aiResponse.resumo_fatos}</pre></div>`);
                    }
                }
            }

            setProgress(100);
            setProgressStatus('Concluído!');

        } catch (error) {
            console.error(error);
            setProgress(0);
            setProgressStatus('Erro na geração.');
        }
    };

    // ... (Resto do arquivo mantém-se igual: useEffect, searchClients, etc.)
    useEffect(() => {
        if (availableTasks.length > 0) setDocType(availableTasks[0]);
    }, [tasksParam]);

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const searchClients = async (query: string) => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        setIsSearching(true);

        searchTimeoutRef.current = setTimeout(async () => {
            if (!query || query.length < 3) {
                setSuggestions([]);
                setIsSearching(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('*')
                    .ilike('name', `%${query}%`)
                    .limit(5)
                    .order('name', { ascending: true });

                if (error) { throw error; }

                if (data) {
                    setSuggestions(data as ClientData[]);
                    setShowSuggestions(true);
                }
            } catch (err) {
                console.error('Erro na pesquisa:', err);
                setSuggestions([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    return {
        user, profile, agents,
        generatedContent: docGen.generatedContent,
        isGenerating: docGen.isGenerating,
        progress, progressStatus,
        signers, setSigners, selectedSignerIds, setSelectedSignerIds,
        isSignerDropdownOpen, setIsSignerDropdownOpen,
        clientData, setClientData, suggestions, showSuggestions, setShowSuggestions, isSearching,
        docType, setDocType, isSaving, setIsSaving,
        initialAgentTitle, sphereParam, availableTasks,
        generate, 
        incrementUsage, fetchProfile, isLimitReached, searchClients, setProgress, setProgressStatus,
        setGeneratedContent: docGen.setGeneratedContent 
    };
};