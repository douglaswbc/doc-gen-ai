import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDocumentGenerator } from './useDocumentGenerator';
import { useProfile } from './useProfile';
import { useAgents } from './useAgents';
import { ClientData, Signer } from '../types';

// Importando o template do local correto (utils)
import { template as salarioMaternidadeTemplate } from '../utils/templates/salarioMaternidade'; 

export const useCreateDocumentLogic = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const { profile, fetchProfile, isLimitReached, incrementUsage } = useProfile();
    const { agents } = useAgents(true);
    
    const docGen = useDocumentGenerator();

    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState('Aguardando...');
    const [signers, setSigners] = useState<Signer[]>([]);
    const [selectedSignerIds, setSelectedSignerIds] = useState<string[]>([]);
    const [isSignerDropdownOpen, setIsSignerDropdownOpen] = useState(false);

    // Estado do Formulário
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

    // === CORREÇÃO AQUI: Declarando as variáveis da URL ===
    const initialAgentTitle = searchParams.get('type') || '';
    const tasksParam = searchParams.get('tasks');
    const sphereParam = searchParams.get('sphere'); // <--- A linha que faltava
    const availableTasks = tasksParam ? JSON.parse(decodeURIComponent(tasksParam)) : [];
    const { clientId } = useParams<{ clientId?: string }>();

    // If a clientId is present in the path, load that client and hydrate the form
    useEffect(() => {
        const loadClient = async () => {
            if (!clientId) return;
            try {
                const { data, error } = await supabase.from('clients').select('*').eq('id', clientId).single();
                if (error) throw error;
                if (data) setClientData(prev => ({ ...prev, ...data }));
            } catch (err) {
                console.error('Erro ao carregar cliente por clientId:', err);
            }
        };
        loadClient();
    }, [clientId]);

    // === FUNÇÃO PRINCIPAL DE GERAÇÃO (CONECTADA AO PYTHON) ===
    const generate = async (
        agentName: string, 
        docType: string, 
        clientName: string, 
        details: string, 
        provider: string,
        systemInstruction: string
    ) => {
        try {
            setProgress(10);
            setProgressStatus('Conectando ao servidor neural...');

            setProgress(30);
            setProgressStatus('Processando no Python (Buscando Jurisprudência e Redigindo)...');

            // Chamada Unificada ao Backend
            const aiResponse = await docGen.generate(
                agentName || 'salario_maternidade', 
                docType,
                clientName,
                details, 
                provider,
                systemInstruction, 
                clientData 
            );

            setProgress(80);
            setProgressStatus('Formatando documento final...');

            if (aiResponse) {
                const selectedSignersList = signers.filter(s => selectedSignerIds.includes(s.id));
                
                try {
                    // Renderiza o template com os dados vindos do Python
                    const finalHtml = salarioMaternidadeTemplate.render(
                        aiResponse,    
                        clientData,    
                        profile?.office,
                        selectedSignersList
                    );
                    
                    docGen.setGeneratedContent(finalHtml);
                    setProgress(100);
                    setProgressStatus('Concluído!');

                } catch (templateError) {
                    console.error("Erro ao renderizar template:", templateError);
                    docGen.setGeneratedContent(`<div style="color:red">Erro ao formatar HTML: ${templateError}</div>`);
                }
            } else {
                setProgress(0);
                setProgressStatus('Erro: Sem resposta do servidor.');
            }

        } catch (error) {
            console.error(error);
            setProgress(0);
            setProgressStatus('Erro na conexão.');
        }
    };

    // ... Search Clients ...
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

    useEffect(() => {
        if (availableTasks.length > 0) setDocType(availableTasks[0]);
    }, [tasksParam]);

    return {
        user, profile, agents,
        generatedContent: docGen.generatedContent,
        isGenerating: docGen.isGenerating,
        progress, progressStatus,
        signers, setSigners, selectedSignerIds, setSelectedSignerIds,
        isSignerDropdownOpen, setIsSignerDropdownOpen,
        clientData, setClientData, suggestions, showSuggestions, setShowSuggestions, isSearching,
        docType, setDocType, isSaving, setIsSaving,
        initialAgentTitle, 
        sphereParam, // Agora esta variável existe!
        availableTasks,
        generate, 
        incrementUsage, fetchProfile, isLimitReached, searchClients, setProgress, setProgressStatus,
        setGeneratedContent: docGen.setGeneratedContent 
    };
};