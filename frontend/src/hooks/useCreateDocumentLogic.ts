import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDocumentGenerator } from './useDocumentGenerator';
import { useProfile } from './useProfile';
import { useAgents } from './useAgents';
import { ClientData, Signer } from '../types';

// Importando o template do local correto (utils)
// Importando o seletor de templates dinâmico
import { getTemplate } from '../utils/templates';

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
        zip_code: '', city: '', state: '', neighborhood: '',
        child_name: '', child_cpf: '', child_birth_date: '',
        children: [{ name: '', cpf: '', birth_date: '', benefits: [{ der: '', nb: '', benefit_status: 'indeferido', denied_date: '', decision_reason: '' }] }],
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
    const [jurisdiction, setJurisdiction] = useState<any>(null);

    // === CORREÇÃO AQUI: Declarando as variáveis da URL ===
    const initialAgentTitle = searchParams.get('type') || '';
    const tasksParam = searchParams.get('tasks');
    const sphereParam = searchParams.get('sphere'); // <--- A linha que faltava
    const availableTasks = tasksParam ? JSON.parse(decodeURIComponent(tasksParam)) : [];
    const { clientId } = useParams<{ clientId?: string }>();

    const fetchJurisdiction = async (city: string, state: string) => {
        if (!city || !state) return;
        setJurisdiction(null);
        try {
            const stateUpper = state.toUpperCase();
            const searchTerms = city.trim().toLowerCase();

            // 1. Busca todos os municípios do estado
            const { data: allMun, error: munError } = await supabase
                .from('municipalities')
                .select('id, name')
                .eq('state', stateUpper);

            if (munError) throw munError;

            // Tenta encontrar o município que está presente na string digitada
            // Prioriza o nome mais longo em caso de múltiplas correspondências (ex: "Santarem" vs "Santarém Novo")
            const matchedMun = allMun
                ?.filter(m => searchTerms.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(searchTerms))
                .sort((a, b) => b.name.length - a.name.length)[0];

            if (!matchedMun) return;

            // 2. Busca detalhes da jurisdição
            const { data, error } = await supabase
                .from('jurisdiction_map')
                .select(`
                    legal_basis,
                    municipality:municipality_id (name, state),
                    judicial_subsections (
                        name,
                        city,
                        has_jef,
                        judicial_sections (
                            name
                        )
                    )
                `)
                .eq('municipality_id', matchedMun.id)
                .limit(1)
                .single();

            if (error) throw error;

            if (data && data.judicial_subsections) {
                const subsection = data.judicial_subsections;
                // @ts-ignore
                const sectionName = subsection.judicial_sections?.name;

                setJurisdiction({
                    city: data.municipality?.name || matchedMun.name,
                    state: data.municipality?.state || stateUpper,
                    courtCity: subsection.city,
                    subsection: subsection.name,
                    has_jef: subsection.has_jef,
                    section: sectionName,
                    legal_basis: data.legal_basis
                });
            }
        } catch (err) {
            console.error('Erro ao buscar jurisdição:', err);
            setJurisdiction(null);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchJurisdiction(clientData.city || '', clientData.state || '');
        }, 800);
        return () => clearTimeout(timeout);
    }, [clientData.city, clientData.state]);

    // If a clientId is present in the path, load that client and hydrate the form
    useEffect(() => {
        const loadClient = async () => {
            if (!clientId) return;
            try {
                const { data, error } = await supabase.from('clients').select('*').eq('id', clientId).single();
                if (error) throw error;
                if (data) {
                    let children = [{ name: data.child_name || '', cpf: data.child_cpf || '', birth_date: data.child_birth_date || '' }];
                    try {
                        if (data.children && Array.isArray(data.children) && data.children.length > 0) {
                            children = data.children.map((c: any) => ({
                                name: c.name || '',
                                cpf: c.cpf || '',
                                birth_date: c.birth_date || '',
                                benefits: c.benefits || [{ der: '', nb: '', benefit_status: 'indeferido', denied_date: '', decision_reason: '' }]
                            }));
                        }
                    } catch (e) {
                        console.warn('Erro ao parsear children JSON:', e);
                    }
                    setClientData(prev => ({ ...prev, ...data, children }));
                }
            } catch (err) {
                console.error('Erro ao carregar cliente por clientId:', err);
            }
        };
        loadClient();
    }, [clientId]);

    const saveClientToDb = async () => {
        if (!user || !clientData.name) return null;

        const payload: any = {
            ...clientData,
            user_id: user.id,
            updated_at: new Date().toISOString(),
            children: clientData.children?.map((c: any) => ({
                name: c.name || null,
                cpf: c.cpf || null,
                birth_date: c.birth_date || null,
                benefits: c.benefits || []
            })) || []
        };
        const dateFields = ['birth_date', 'child_birth_date', 'der', 'denied_date'];

        // Removido delete payload.children, pois agora é salvo diretamente via JSONB no upsert
        // Não deletar mais city, state, zip_code e neighborhood, pois agora existem na tabela clients
        delete payload.child_name;
        delete payload.child_cpf;
        delete payload.child_birth_date;

        const ruralVal = payload.rural_start_date;
        if (ruralVal && ruralVal !== '') {
            payload.rural_start_date = ruralVal;
            payload.rural_tasks = [payload.rural_tasks || '', `Início atividade rural: ${ruralVal}`].filter(Boolean).join('\n');
        } else {
            payload.rural_start_date = null;
        }

        dateFields.forEach(field => {
            if (payload[field] === '') {
                payload[field] = null;
            }
        });

        if (!payload.id) delete payload.id;
        if (profile?.office_id) payload.office_id = profile.office_id;

        try {
            const { data, error } = await supabase.from('clients').upsert(payload).select().single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Erro ao salvar cliente:', err);
            return null;
        }
    };

    const [isGenerating, setIsGenerating] = useState(false);

    const generate = async (
        agentName: string,
        agentSlug: string,
        docType: string,
        clientName: string,
        details: string,
        provider: string,
        systemInstruction: string
    ) => {
        setIsGenerating(true);
        try {
            setProgress(5);
            setProgressStatus('Salvando dados do cliente...');
            const savedClient = await saveClientToDb();
            if (savedClient) setClientData(prev => ({ ...prev, id: savedClient.id }));

            setProgress(15);
            setProgressStatus('Conectando ao servidor neural...');

            setProgress(35);
            setProgressStatus('Processando no Python (Buscando Jurisprudência e Redigindo)...');

            // Chamada Unificada ao Backend
            const aiResponse = await docGen.generate(
                agentName,
                agentSlug,
                docType,
                clientName,
                details,
                provider,
                systemInstruction,
                clientData
            );

            if (aiResponse) {
                // BRECHA FECHADA: Debita o crédito assim que a IA terminou o trabalho, 
                // idependente se o usuário vai clicar em "Salvar" depois ou não.
                await incrementUsage();

                setProgress(80);
                setProgressStatus('Formatando documento final...');

                const selectedSignersList = signers.filter(s => selectedSignerIds.includes(s.id));

                try {
                    // Injeta jurisdição se encontrada no hook
                    if (jurisdiction) {
                        aiResponse.jurisdiction = jurisdiction;
                    }

                    // Busca o template dinamicamente com base no nome do agente
                    const dynamicTemplate = getTemplate(agentName);

                    // Renderiza o template com os dados vindos do Python e jurisdição estruturada
                    const finalHtml = dynamicTemplate.render(
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
        } finally {
            setIsGenerating(false);
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
        user, profile, agents, usage,
        generatedContent: docGen.generatedContent,
        isGenerating: isGenerating,
        progress, progressStatus,
        signers, setSigners, selectedSignerIds, setSelectedSignerIds,
        isSignerDropdownOpen, setIsSignerDropdownOpen,
        clientData, setClientData, suggestions, showSuggestions, setShowSuggestions, isSearching,
        docType, setDocType, isSaving, setIsSaving,
        initialAgentTitle,
        sphereParam, // Agora esta variável existe!
        availableTasks,
        generate,
        saveClientToDb,
        incrementUsage, fetchProfile, isLimitReached, searchClients, setProgress, setProgressStatus,
        setGeneratedContent: docGen.setGeneratedContent,
        jurisdiction, fetchJurisdiction
    };
};