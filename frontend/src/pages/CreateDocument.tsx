import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { useCreateDocumentLogic } from '../hooks/useCreateDocumentLogic';
import { AIProvider } from '../services/ai/orchestrator';
import { downloadAsPDF, downloadAsWord, sanitizeFilename } from '../utils/documentExport';
import { maskCPF, maskNB, maskCEP, unmask } from '../utils/masks';
import Stepper from '../components/Stepper';
import { useAutoSave } from '../hooks/useAutoSave';
// Importando o seletor de templates dinâmico
import { getTemplate } from '../utils/templates';

const CreateDocument: React.FC = () => {
  const navigate = useNavigate();
  const {
    user, profile, agents, generatedContent, isGenerating, progress, progressStatus,
    signers, setSigners, selectedSignerIds, setSelectedSignerIds,
    isSignerDropdownOpen, setIsSignerDropdownOpen,
    clientData, setClientData, suggestions, showSuggestions, setShowSuggestions, isSearching,
    docType, setDocType, isSaving, setIsSaving,
    initialAgentTitle, sphereParam, availableTasks,
    generate, saveClientToDb, incrementUsage, fetchProfile, isLimitReached, searchClients, setProgress, setProgressStatus,
    setGeneratedContent, jurisdiction, fetchJurisdiction
  } = useCreateDocumentLogic();

  const viewerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Stepper para indicar progresso do formulário
  const [currentStep, setCurrentStep] = useState(1);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const steps = [
    { id: 1, title: 'Dados Básicos' },
    { id: 2, title: 'Benefício' },
    { id: 3, title: 'Detalhes' },
  ];

  // Auto-save do formulário
  const { save: saveForm, clear: clearAutoSave } = useAutoSave({
    key: `createDoc_${sphereParam || 'default'}`,
    data: clientData,
    interval: 30000,
    onRestore: (savedData) => {
      if (savedData && Object.keys(savedData).length > 0) {
        const hasData = savedData.name || savedData.cpf;
        if (hasData && window.confirm('Encontramos dados de um rascunho anterior. Deseja restaurar?')) {
          setClientData(prev => ({ ...prev, ...savedData }));
          toast.info('Rascunho restaurado!');
        } else {
          clearAutoSave();
        }
      }
    },
    enabled: !generatedContent
  });

  const MERCADO_PAGO_LINK = import.meta.env.VITE_MERCADO_PAGO_LINK || "#";
  const aiProvider: AIProvider = 'openai';

  const sanitizeData = (data: any) => {
    const clean = { ...data };
    Object.keys(clean).forEach(key => {
      if (clean[key] === null || clean[key] === undefined) {
        // Only convert to empty string if it's NOT a column that might be a DATE in the DB
        const dateFields = ['birth_date', 'child_birth_date', 'der', 'denied_date', 'rural_start_date'];
        if (!dateFields.includes(key)) {
          clean[key] = '';
        }
      }
    });
    return clean;
  };

  const toggleSigner = (id: string) => {
    setSelectedSignerIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(signerId => signerId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setProgress(0);
      setProgressStatus('Iniciando IA...');
      interval = setInterval(() => {
        setProgress((prev) => {
          let increment = 0;
          if (prev < 30) increment = 2;
          else if (prev < 70) increment = 1;
          else if (prev < 95) increment = 0.2;
          const newProgress = Math.min(prev + increment, 95);
          if (newProgress < 20) setProgressStatus('Conectando ao Agente...');
          else if (newProgress < 40) setProgressStatus('Consultando Legislação e STF...');
          else if (newProgress < 70) setProgressStatus('Redigindo Argumentação Jurídica...');
          else if (newProgress < 90) setProgressStatus('Formatando Cabeçalho e Assinatura...');
          else setProgressStatus('Finalizando Documento...');
          return newProgress;
        });
      }, 100);
    } else if (generatedContent) {
      setProgress(100);
      setProgressStatus('Concluído!');
    }
    return () => clearInterval(interval);
  }, [isGenerating, generatedContent]);

  useEffect(() => {
    const loadContext = async () => {
      // Removido carregamento automático do localStorage para manter formulário limpo
      // O usuário agora deve digitar o nome para pesquisar clientes existentes

      await fetchProfile();
      if (profile?.office_id) {
        const { data: teamData } = await supabase
          .from('profiles')
          .select('id, full_name, oab, role')
          .eq('office_id', profile.office_id)
          .eq('is_active', true)
          .in('role', ['office', 'admin', 'advocate']);
        if (teamData) {
          setSigners(teamData);
          const myself = teamData.find(s => s.id === user?.id);
          if (myself) setSelectedSignerIds([myself.id]);
          else if (teamData.length > 0) setSelectedSignerIds([teamData[0].id]);
        }
      }
    };
    loadContext();
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setShowSuggestions(false);
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsSignerDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [user, profile?.office_id]);

  const formatPromptDetails = () => {
    const selectedSignersList = signers.filter(s => selectedSignerIds.includes(s.id));
    const officeInfo = profile?.office ? `
      CABEÇALHO / RODAPÉ DO ESCRITÓRIO:
      - Nome do Escritório: ${profile.office.name}
      - Endereço: ${profile.office.address || ''}
      - Telefone: ${profile.office.phone || ''}
      - Site/Email: ${profile.office.website || ''}
    ` : '';
    const childrenInfo = (clientData.children && clientData.children.length > 0)
      ? clientData.children.map((c: any, idx: number) => `
      FILHO(A) ${idx + 1}:
      - Nome: ${c.name}
      - CPF: ${c.cpf}
      - Data Nasc: ${c.birth_date}`).join('\n')
      : 'Nenhum filho informado.';

    const signersInfo = selectedSignersList.length > 0
      ? `ADVOGADOS(AS) RESPONSÁVEIS:\n${selectedSignersList.map(s => `- ${s.full_name} (OAB: ${s.oab || 'N/D'})`).join('\n')}`
      : 'Nenhum advogado selecionado.';

    return `
      ${officeInfo}
      ${signersInfo}
      DADOS COMPLETOS DO CLIENTE:
      - Nome: ${clientData.name}
      - Nacionalidade: ${clientData.nationality}
      - Estado Civil: ${clientData.marital_status || 'N/D'}
      - Profissão: ${clientData.profession}
      - Data de Nascimento: ${clientData.birth_date}
      - CPF: ${clientData.cpf}
      - RG: ${clientData.rg} (Org. Exp: ${clientData.rg_issuer})
      - Endereço: ${clientData.address}
      
      DADOS DO(S) FILHO(S):
      ${childrenInfo}

      DADOS DO BENEFÍCIO:
      - DER: ${clientData.der}
      - NB: ${clientData.nb}
      - Situação: ${clientData.benefit_status}
      - Data Indeferimento: ${clientData.denied_date}
      - Motivo: ${clientData.decision_reason}
      - Histórico Rural: ${clientData.rural_tasks}
      - Provas: ${clientData.evidence_list}
      - Contexto: ${clientData.case_details}
      - Detalhes: ${clientData.specific_details}
    `;
  };


  const handleGenerate = async () => {
    if (isLimitReached) { toast.error('Limite do plano atingido.'); return; }
    if (selectedSignerIds.length === 0) { toast.warning('Selecione pelo menos um advogado para assinar.'); return; }
    let selectedAgent = agents.find(a => a.name === initialAgentTitle);
    if (!selectedAgent && sphereParam) selectedAgent = agents.find(a => a.sphere.toLowerCase() === sphereParam.toLowerCase());
    if (!selectedAgent && agents.length > 0) selectedAgent = agents[0];
    if (!selectedAgent) { toast.error('Erro: Nenhum agente de IA encontrado.'); return; }

    await generate(selectedAgent.name, docType, clientData.name, formatPromptDetails(), aiProvider, selectedAgent.system_instruction);
    await incrementUsage();
    fetchProfile();
  };

  const handleSaveDocument = async () => {
    if (!generatedContent || !user) return;
    setIsSaving(true);
    const savedClient = await saveClientToDb();
    if (!savedClient) { setIsSaving(false); return; }

    // Busca dados do perfil do usuário logado para preencher campos de controle
    const selectedSignersList = signers.filter(s => selectedSignerIds.includes(s.id));
    const primarySigner = selectedSignersList[0];

    const { error } = await supabase.from('documents').insert({
      user_id: user.id,
      client_id: savedClient.id,
      title: `${docType} - ${clientData.name}`,
      specialty: initialAgentTitle || 'Geral',
      type: docType,
      status: 'Draft',
      content: generatedContent,
      office_id: profile?.office_id || null,
      generated_by: user.id,
      generated_by_name: profile?.full_name || user.email || 'Usuário',
      generated_by_oab: primarySigner?.oab || profile?.oab || null,
      generated_at: new Date().toISOString()
    });
    if (error) toast.error('Erro ao salvar documento.');
    else { toast.success('Documento salvo!'); navigate(`/clients/${savedClient.id}`); }
    setIsSaving(false);
  };

  const handleCopy = () => {
    if (!generatedContent) return;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generatedContent;
    const plainText = tempDiv.innerText;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; } p { text-align: justify; line-height: 1.5; } table { width: 100%; border-collapse: collapse; border: 1px solid black; } th, td { border: 1px solid black; padding: 8px; }</style></head><body>${generatedContent}</body></html>`;
    const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
    const textBlob = new Blob([plainText], { type: 'text/plain' });
    const data = [new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })];
    navigator.clipboard.write(data).then(() => toast.success('Copiado!')).catch(() => {
      navigator.clipboard.writeText(plainText);
      toast.success('Copiado texto puro.');
    });
  };

  const inputClass = "w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all";
  const labelClass = "block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1";

  const [cepLoading, setCepLoading] = useState(false);

  const lookupCep = async (cepRaw?: string) => {
    const cep = (cepRaw || clientData.zip_code || '').toString().replace(/\D/g, '');
    if (!cep || cep.length !== 8) {
      toast.error('CEP inválido. Informe 8 dígitos.');
      return;
    }
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      if (data.erro) { toast.error('CEP não encontrado.'); return; }
      const address = `${data.logradouro || ''}${data.bairro ? ', ' + data.bairro : ''}${data.localidade ? ', ' + data.localidade : ''} - ${data.uf || ''}`;
      setClientData(prev => ({ ...prev, zip_code: cep, neighborhood: data.bairro || '', city: data.localidade || '', state: data.uf || '', address }));
      toast.success('Endereço preenchido pelo CEP.');
    } catch (err) {
      console.error('Erro ao consultar CEP', err);
      toast.error('Erro ao consultar CEP.');
    } finally {
      setCepLoading(false);
    }
  };

  return (
    <>
      <div className="flex-1 w-full max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-8 h-full">

          {/* === CONTAINER PRINCIPAL === */}
          <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto transition-all duration-500">
            {!generatedContent && !isReviewMode && (
              <div className="contents">
                <div className="flex items-center justify-between">
                  <div>
                    <button onClick={() => navigate(-1)} className="flex items-center text-sm text-slate-500 hover:text-primary mb-1">
                      <span className="material-symbols-outlined mr-1">arrow_back</span> Voltar
                    </button>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">{initialAgentTitle || 'Novo Documento'}</h1>
                  </div>
                  {sphereParam && <span className="text-xs uppercase bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">{sphereParam}</span>}
                </div>

                {/* STEPPER VISUAL */}
                <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <Stepper
                    steps={steps}
                    currentStep={currentStep}
                    onStepClick={(id) => setCurrentStep(id)}
                    allowClickNavigation={true}
                  />
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-2">
                    <span className="material-symbols-outlined text-sm text-green-500">cloud_done</span>
                    Auto-save ativado (salva a cada 30s)
                  </div>
                </div>

                <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  <hr className="border-slate-100 dark:border-slate-800" />

                  {currentStep === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                      <div>
                        <label className={labelClass}>Tipo de Documento</label>
                        <select autoFocus value={docType} onChange={(e) => setDocType(e.target.value)} className={inputClass}>
                          {availableTasks.length > 0 ? availableTasks.map((t: any) => <option key={t} value={t}>{t}</option>) : <option>Petição Inicial</option>}
                        </select>
                      </div>

                      {/* SELEÇÃO DE ADVOGADO (MÚLTIPLA COM DROPDOWN CUSTOMIZADO) */}
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800/50">
                        <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">draw</span> Advogados Responsáveis (Assinatura)
                        </label>

                        <div className="relative" ref={dropdownRef}>
                          <button
                            type="button"
                            onClick={() => setIsSignerDropdownOpen(!isSignerDropdownOpen)}
                            className="w-full p-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-left flex justify-between items-center text-slate-900 dark:text-white hover:border-blue-400 transition-colors"
                          >
                            <span className="truncate">
                              {selectedSignerIds.length === 0
                                ? "Selecione quem assina..."
                                : `${selectedSignerIds.length} selecionado(s): ` + signers.filter(s => selectedSignerIds.includes(s.id)).map(s => s.full_name.split(' ')[0]).join(', ')
                              }
                            </span>
                            <span className="material-symbols-outlined text-slate-500">expand_more</span>
                          </button>

                          {isSignerDropdownOpen && (
                            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-800 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                              {signers.length > 0 ? (
                                signers.map(signer => (
                                  <div
                                    key={signer.id}
                                    onClick={() => toggleSigner(signer.id)}
                                    className="flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                                  >
                                    <div className={`size-5 rounded border flex items-center justify-center ${selectedSignerIds.includes(signer.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                      {selectedSignerIds.includes(signer.id) && <span className="material-symbols-outlined text-white text-xs font-bold">check</span>}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-slate-800 dark:text-white">{signer.full_name}</p>
                                      <p className="text-xs text-slate-500">OAB: {signer.oab || 'Pendente'}</p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-3 text-sm text-slate-500 text-center">Nenhum advogado encontrado</div>
                              )}
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                          O documento será personalizado com o timbre do escritório <b>{profile?.office?.name || 'seu escritório'}</b> e incluirá os nomes selecionados no rodapé.
                        </p>
                      </div>

                      <hr className="border-slate-100 dark:border-slate-800" />

                      {/* DADOS DO CLIENTE */}
                      <div>
                        <h3 className="text-primary font-bold flex items-center gap-2 mb-4"><span className="material-symbols-outlined">person</span> Dados do Cliente</h3>
                        <div className="space-y-4" ref={wrapperRef}>
                          <div className="relative">
                            <label className={labelClass}>Nome Completo</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={clientData.name}
                                onChange={(e) => {
                                  setClientData({ ...clientData, name: e.target.value });
                                  searchClients(e.target.value)
                                }}
                                className={inputClass}
                                placeholder="Digite o nome para pesquisar..."
                              />
                              {isSearching && (
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin">
                                  progress_activity
                                </span>
                              )}
                            </div>

                            {/* Dropdown de sugestões */}
                            {showSuggestions && suggestions.length > 0 && (
                              <div className="absolute z-50 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                                {suggestions.map(c => (
                                  <div key={c.id} onClick={() => {
                                    const cleanClient = sanitizeData(c);
                                    setClientData(prev => ({ ...prev, ...cleanClient }));
                                    setShowSuggestions(false);
                                  }} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0">
                                    <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                                    <div className="text-xs text-slate-500">CPF: {c.cpf}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Mensagem quando não há resultados */}
                            {showSuggestions && suggestions.length === 0 && clientData.name.length >= 2 && !isSearching && (
                              <div className="absolute z-50 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl mt-1 p-4 text-center">
                                <span className="material-symbols-outlined text-slate-400 text-3xl mb-2">person_search</span>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum cliente encontrado</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Continue preenchendo para criar novo cliente</p>
                              </div>
                            )}
                          </div>
                          {/* Campos Pessoais */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className={labelClass}>Nacionalidade</label><input value={clientData.nationality} onChange={e => setClientData({ ...clientData, nationality: e.target.value })} className={inputClass} placeholder="Ex: Brasileira" /></div>
                            <div>
                              <label className={labelClass}>Estado Civil</label>
                              <select value={clientData.marital_status} onChange={e => setClientData({ ...clientData, marital_status: e.target.value })} className={inputClass}>
                                <option value="">Selecione...</option><option value="Solteiro(a)">Solteiro(a)</option><option value="Casado(a)">Casado(a)</option><option value="Divorciado(a)">Divorciado(a)</option><option value="Viúvo(a)">Viúvo(a)</option><option value="União Estável">União Estável</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className={labelClass}>Profissão</label><input value={clientData.profession ?? ''} onChange={e => setClientData({ ...clientData, profession: e.target.value })} className={inputClass} placeholder="Ex: Agricultora" /></div>
                            <div><label className={labelClass}>Data de Nascimento</label><input type="date" value={clientData.birth_date ?? ''} onChange={e => setClientData({ ...clientData, birth_date: e.target.value })} className={inputClass} /></div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-5">
                              <label className={labelClass}>CPF</label>
                              <input
                                value={maskCPF(clientData.cpf)}
                                onChange={e => setClientData({ ...clientData, cpf: unmask(e.target.value).slice(0, 11) })}
                                className={inputClass}
                                placeholder="000.000.000-00"
                              />
                            </div>
                            <div className="md:col-span-4">
                              <label className={labelClass}>RG</label>
                              <input value={clientData.rg} onChange={e => setClientData({ ...clientData, rg: e.target.value })} className={inputClass} placeholder="Número" />
                            </div>
                            <div className="md:col-span-3">
                              <label className={labelClass}>Órgão Exp.</label>
                              <input value={clientData.rg_issuer} onChange={e => setClientData({ ...clientData, rg_issuer: e.target.value })} className={inputClass} placeholder="Ex: SSP/PA" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-1">
                              <label className={labelClass}>CEP</label>
                              <div className="flex gap-2">
                                <input
                                  value={maskCEP(clientData.zip_code || '')}
                                  onChange={e => setClientData({ ...clientData, zip_code: unmask(e.target.value).slice(0, 8) })}
                                  className={`${inputClass} md:flex-1`}
                                  placeholder="00000-000"
                                />
                                <button type="button" onClick={() => lookupCep()} disabled={cepLoading} className="px-3 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-colors">
                                  {cepLoading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : 'Buscar'}
                                </button>
                              </div>
                            </div>
                            <div className="md:col-span-3">
                              <label className={labelClass}>Endereço Completo</label>
                              <input value={clientData.address} onChange={e => setClientData({ ...clientData, address: e.target.value })} className={inputClass} placeholder="Rua, Número, Bairro, Cidade - UF" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DADOS DA CRIANÇA (AGORA SUPORTA MÚLTIPLAS) */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-slate-600 dark:text-slate-400 font-bold text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">child_care</span>
                            Dados da(s) Criança(s)
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setClientData(prev => ({
                                ...prev,
                                children: [...(prev.children || []), {
                                  name: '',
                                  cpf: '',
                                  birth_date: '',
                                  benefits: [{
                                    der: '',
                                    nb: '',
                                    benefit_status: 'indeferido',
                                    denied_date: '',
                                    decision_reason: ''
                                  }]
                                }]
                              }));
                            }}
                            className="size-8 flex items-center justify-center bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                            title="Adicionar Criança"
                          >
                            <span className="material-symbols-outlined">add</span>
                          </button>
                        </div>

                        <div className="space-y-4">
                          {(clientData.children || []).map((child, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800/50 shadow-sm relative group">
                              <div className="md:col-span-5">
                                <label className={labelClass}>Nome da Criança</label>
                                <input
                                  placeholder="Nome completo da criança"
                                  maxLength={100}
                                  value={child.name}
                                  onChange={e => {
                                    const next = [...(clientData.children || [])];
                                    next[idx] = { ...next[idx], name: e.target.value };
                                    const base: any = { children: next };
                                    if (idx === 0) { base.child_name = e.target.value; }
                                    setClientData(prev => ({ ...prev, ...base }));
                                  }}
                                  className={inputClass}
                                />
                              </div>

                              <div className="md:col-span-3">
                                <label className={labelClass}>CPF</label>
                                <input
                                  value={maskCPF(child.cpf || '')}
                                  onChange={e => {
                                    const clean = unmask(e.target.value).slice(0, 11);
                                    const next = [...(clientData.children || [])];
                                    next[idx] = { ...next[idx], cpf: clean };
                                    const base: any = { children: next };
                                    if (idx === 0) { base.child_cpf = clean; }
                                    setClientData(prev => ({ ...prev, ...base }));
                                  }}
                                  placeholder="000.000.000-00"
                                  className={inputClass}
                                />
                              </div>

                              <div className="md:col-span-3">
                                <label className={labelClass}>Data Nasc.</label>
                                <input
                                  type="date"
                                  value={child.birth_date}
                                  onChange={e => {
                                    const next = [...(clientData.children || [])];
                                    next[idx] = { ...next[idx], birth_date: e.target.value };
                                    const base: any = { children: next };
                                    if (idx === 0) { base.child_birth_date = e.target.value; }
                                    setClientData(prev => ({ ...prev, ...base }));
                                  }}
                                  className={inputClass}
                                />
                              </div>

                              <div className="md:col-span-1 flex justify-end">
                                {(clientData.children || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...(clientData.children || [])];
                                      next.splice(idx, 1);
                                      const first = next[0] || { name: '', cpf: '', birth_date: '' };
                                      setClientData(prev => ({
                                        ...prev,
                                        children: next,
                                        child_name: first.name,
                                        child_cpf: first.cpf,
                                        child_birth_date: first.birth_date
                                      }));
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Remover"
                                  >
                                    <span className="material-symbols-outlined">delete</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                      {/* DADOS DO BENEFÍCIO POR CRIANÇA */}
                      <div>
                        <h3 className="text-primary font-bold flex items-center gap-2 mb-4 mt-6"><span className="material-symbols-outlined">child_care</span> Detalhes por Criança</h3>

                        <div className="space-y-8">
                          {(clientData.children || []).map((child, childIdx) => (
                            <div key={childIdx} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                  <span className="material-symbols-outlined text-primary">child_care</span>
                                  {child.name || `Criança ${childIdx + 1}`}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...(clientData.children || [])];
                                    const benefits = [...(next[childIdx].benefits || [])];
                                    benefits.push({ der: '', nb: '', benefit_status: 'indeferido', denied_date: '', decision_reason: '' });
                                    next[childIdx] = { ...next[childIdx], benefits };
                                    setClientData({ ...clientData, children: next });
                                  }}
                                  className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold hover:bg-primary/20 transition-colors"
                                >
                                  + Adicionar Benefício/Negativa
                                </button>
                              </div>

                              <div className="space-y-6">
                                {(child.benefits || []).map((benefit, bIdx) => (
                                  <div key={bIdx} className="relative bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                    {bIdx > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = [...(clientData.children || [])];
                                          const benefits = (next[childIdx].benefits || []).filter((_, i) => i !== bIdx);
                                          next[childIdx] = { ...next[childIdx], benefits };
                                          setClientData({ ...clientData, children: next });
                                        }}
                                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                                      >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                      </button>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className={labelClass}>DER (Data Entrada)</label>
                                        <input
                                          type="date"
                                          value={benefit.der}
                                          onChange={e => {
                                            const next = [...(clientData.children || [])];
                                            const benefits = [...(next[childIdx].benefits || [])];
                                            benefits[bIdx] = { ...benefits[bIdx], der: e.target.value };
                                            next[childIdx] = { ...next[childIdx], benefits };
                                            setClientData({ ...clientData, children: next });
                                          }}
                                          className={inputClass}
                                        />
                                      </div>
                                      <div>
                                        <label className={labelClass}>NB (Número do Benefício)</label>
                                        <input
                                          value={maskNB(benefit.nb)}
                                          onChange={e => {
                                            const next = [...(clientData.children || [])];
                                            const benefits = [...(next[childIdx].benefits || [])];
                                            benefits[bIdx] = { ...benefits[bIdx], nb: unmask(e.target.value).slice(0, 10) };
                                            next[childIdx] = { ...next[childIdx], benefits };
                                            setClientData({ ...clientData, children: next });
                                          }}
                                          placeholder="000.000.000-0"
                                          className={inputClass}
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                      <div className="md:col-span-8">
                                        <label className={labelClass}>Situação</label>
                                        <select
                                          value={benefit.benefit_status}
                                          onChange={e => {
                                            const next = [...(clientData.children || [])];
                                            const benefits = [...(next[childIdx].benefits || [])];
                                            benefits[bIdx] = { ...benefits[bIdx], benefit_status: e.target.value };
                                            next[childIdx] = { ...next[childIdx], benefits };
                                            setClientData({ ...clientData, children: next });
                                          }}
                                          className={inputClass}
                                        >
                                          <option value="indeferido">Indeferido</option>
                                          <option value="cessado">Cessado</option>
                                          <option value="em análise">Em Análise</option>
                                          <option value="ativo">Ativo</option>
                                        </select>
                                      </div>
                                      <div className="md:col-span-4">
                                        <label className={labelClass}>Data do Indeferimento</label>
                                        <input
                                          type="date"
                                          value={benefit.denied_date}
                                          onChange={e => {
                                            const next = [...(clientData.children || [])];
                                            const benefits = [...(next[childIdx].benefits || [])];
                                            benefits[bIdx] = { ...benefits[bIdx], denied_date: e.target.value };
                                            next[childIdx] = { ...next[childIdx], benefits };
                                            setClientData({ ...clientData, children: next });
                                          }}
                                          className={inputClass}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className={labelClass}>Motivo da Decisão</label>
                                      <textarea
                                        value={benefit.decision_reason}
                                        onChange={e => {
                                          const next = [...(clientData.children || [])];
                                          const benefits = [...(next[childIdx].benefits || [])];
                                          benefits[bIdx] = { ...benefits[bIdx], decision_reason: e.target.value };
                                          next[childIdx] = { ...next[childIdx], benefits };
                                          setClientData({ ...clientData, children: next });
                                        }}
                                        className={inputClass}
                                        placeholder="Ex: Falta de carência"
                                        rows={3}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                          {/* CAMPOS GERAIS DO PROCESSO */}
                          <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                              <span className="material-symbols-outlined text-primary">info</span>
                              Informações Adicionais da Atividade
                            </h4>
                            <div>
                              <label className={labelClass}>Em que ano ou com que idade iniciou na atividade rural e houve algum período de interrupção?</label>
                              <input
                                value={clientData.rural_start_date ?? ''}
                                onChange={e => setClientData({ ...clientData, rural_start_date: e.target.value })}
                                className={inputClass}
                                placeholder="Ex: Iniciou aos 12 anos em 1995, sem interrupções."
                              />
                            </div>
                            <div><label className={labelClass}>Período de segurado especial declarado</label><input value={clientData.special_insured_period} onChange={e => setClientData({ ...clientData, special_insured_period: e.target.value })} className={inputClass} placeholder="Ex: 01/01/2015 a 10/05/2024" /></div>
                            <div><label className={labelClass}>Ponto Controvertido</label><textarea value={clientData.controversial_point} onChange={e => setClientData({ ...clientData, controversial_point: e.target.value })} className={inputClass} placeholder="Ex: Qualidade de segurado" rows={2} /></div>

                            <div className="grid grid-cols-1 gap-4">
                              <div><label className={labelClass}>Benefício Anterior Concedido?</label><input value={clientData.previous_benefit} onChange={e => setClientData({ ...clientData, previous_benefit: e.target.value })} className={inputClass} placeholder="Não consta" /></div>
                              <div><label className={labelClass}>Período Reconhecido CNIS?</label><input value={clientData.cnis_period} onChange={e => setClientData({ ...clientData, cnis_period: e.target.value })} className={inputClass} placeholder="Não consta" /></div>
                              <div><label className={labelClass}>Vínculo Urbano?</label><input value={clientData.urban_link} onChange={e => setClientData({ ...clientData, urban_link: e.target.value })} className={inputClass} placeholder="Nunca teve" /></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                      {/* HISTÓRICO */}
                      <div>
                        <h3 className="text-primary font-bold flex items-center gap-2 mb-4 mt-6"><span className="material-symbols-outlined">work_history</span> Histórico e Atividade</h3>
                        <div className="space-y-4">
                          <div><label className={labelClass}>Tarefas desempenhadas</label><textarea rows={3} value={clientData.rural_tasks} onChange={e => setClientData({ ...clientData, rural_tasks: e.target.value })} className={inputClass} placeholder="Atividades diárias..." /></div>
                          <div><label className={labelClass}>Provas disponíveis</label><textarea rows={3} value={clientData.evidence_list} onChange={e => setClientData({ ...clientData, evidence_list: e.target.value })} className={inputClass} placeholder="Notas, certidões..." /></div>
                        </div>
                      </div>

                      {/* CONTEXTO */}
                      <div>
                        <h3 className="text-primary font-bold flex items-center gap-2 mb-4 mt-6"><span className="material-symbols-outlined">description</span> Contexto e Detalhes</h3>
                        <div className="space-y-4">
                          <div><label className={labelClass}>Contexto Fático</label><textarea rows={5} value={clientData.case_details} onChange={e => setClientData({ ...clientData, case_details: e.target.value })} className={inputClass} placeholder="História completa..." /></div>
                          <div><label className={labelClass}>Detalhes (informe se haverá pedido liminar, preliminares, alguma tese especifica, etc)</label><textarea rows={3} value={clientData.specific_details} onChange={e => setClientData({ ...clientData, specific_details: e.target.value })} className={inputClass} placeholder="Pedido de tutela, etc." /></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-6 flex gap-4">
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(prev => prev - 1)}
                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                      >
                        Anterior
                      </button>
                    )}

                    {currentStep < 3 ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (currentStep === 1) {
                            const hasAllRequired = clientData.name && clientData.cpf && clientData.birth_date;
                            if (!hasAllRequired) {
                              toast.warning('Preencha os dados básicos do cliente antes de prosseguir.');
                              return;
                            }
                          }
                          setCurrentStep(prev => prev + 1);
                        }}
                        className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-bold shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-1"
                      >
                        Próximo
                      </button>
                    ) : (
                      isLimitReached ? (
                        <a href={MERCADO_PAGO_LINK} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"><span className="material-symbols-outlined mr-2">rocket_launch</span> Fazer Upgrade</a>
                      ) : (
                        <button
                          onClick={() => {
                            const hasAllRequired = clientData.name && clientData.cpf && clientData.birth_date;
                            if (!hasAllRequired) {
                              toast.warning('Preencha os dados básicos do cliente antes de prosseguir.');
                              setCurrentStep(1);
                              return;
                            }
                            setIsReviewMode(true);
                          }}
                          className="flex items-center justify-center flex-1 py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-1"
                        >
                          <span className="material-symbols-outlined mr-2">visibility</span> Revisar e Gerar
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MODO DE REVISÃO (LARGURA TOTAL) */}
            {!generatedContent && isReviewMode && !isGenerating && (
              <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[85vh]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-500">description</span>
                      Prévia do Documento (Rascunho)
                    </h3>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsReviewMode(false)}
                        className="py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Voltar para o Formulário
                      </button>
                      <button
                        onClick={async () => {
                          await handleGenerate();
                        }}
                        disabled={isGenerating}
                        className={`py-2 px-6 bg-primary text-white font-bold rounded-lg shadow-lg hover:shadow-primary/30 transition-all text-sm flex items-center gap-2 ${isGenerating ? 'opacity-70 cursor-wait' : 'hover:-translate-y-1'}`}
                      >
                        {isGenerating ? <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> Gerando...</> : <><span className="material-symbols-outlined text-sm">auto_awesome</span> Confirmar e Gerar com IA</>}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800 p-8 sm:p-12 bg-slate-50 dark:bg-slate-900/50 rounded-lg custom-scrollbar">
                    <div
                      className="prose prose-slate max-w-none dark:prose-invert font-serif bg-white dark:bg-slate-900 p-8 sm:p-16 shadow-xl rounded-sm mx-auto"
                      style={{ maxWidth: '800px' }}
                      dangerouslySetInnerHTML={{
                        __html: getTemplate(initialAgentTitle).render(
                          { // Fake AI Data for preview
                            resumo_fatos: '<p>[Aguardando geração da IA para a narrativa completa dos fatos...]</p>',
                            prioridades: { idoso: false, deficiente: false, menor: true },
                            preliminares: '<p>[Aguardando geração das preliminares...]</p>',
                            jurisdiction: jurisdiction || { city: clientData.city || 'Sua Cidade', state: clientData.state || 'UF', has_jef: true }
                          },
                          clientData,
                          profile?.office,
                          signers.filter(s => selectedSignerIds.includes(s.id)),
                          { name: profile?.full_name || 'Usuário', id: profile?.id || '' }
                        )
                      }}
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-blue-800 dark:text-blue-300 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 justify-center">
                    <span className="material-symbols-outlined text-sm">info</span>
                    <p className="text-xs">Esta é uma visualização dos dados inseridos. A IA irá redigir a narrativa jurídica completa.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* === LOADING STATE (FULL WIDTH) === */}
        {isGenerating && (
          <div className="w-full max-w-4xl mx-auto bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col items-center gap-8">
              <div className="relative">
                <span className="material-symbols-outlined text-7xl text-primary animate-pulse">psychology</span>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
              </div>

              <div className="w-full max-w-md">
                <div className="flex justify-between text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-widest">
                  <span>Processando...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden shadow-inner">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(37,99,235,0.6)]"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200 mt-6 animate-pulse">
                  {progressStatus}
                </p>
                <p className="text-sm text-slate-500 mt-2">Isso pode levar alguns segundos. Estamos redigindo sua peça jurídica...</p>
              </div>
            </div>
          </div>
        )}

        {/* === FINAL DOCUMENT (FULL WIDTH) === */}
        {generatedContent && !isGenerating && (
          <div className="w-full max-w-5xl mx-auto bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-[calc(100vh-120px)] animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-xl sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-500 text-2xl">verified</span>
                <span className="font-bold text-slate-700 dark:text-white">Documento Gerado com Sucesso</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setGeneratedContent('');
                    setIsReviewMode(false);
                  }}
                  className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg font-bold transition-all"
                >
                  <span className="material-symbols-outlined text-sm">edit</span> Voltar ao Formulário
                </button>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                <button onClick={handleSaveDocument} disabled={isSaving} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-sm">
                  <span className="material-symbols-outlined text-sm">save</span> {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
                <button onClick={handleCopy} className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white px-4 py-2 rounded-lg font-bold transition-all">
                  <span className="material-symbols-outlined text-sm">content_copy</span> Copiar
                </button>
                <button
                  onClick={async () => {
                    try {
                      await downloadAsPDF(generatedContent, sanitizeFilename(`${docType}_${clientData.name}`));
                      toast.success('PDF baixado!');
                    } catch (e) { toast.error('Erro ao gerar PDF.'); }
                  }}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-all"
                >
                  <span className="material-symbols-outlined text-sm">picture_as_pdf</span> PDF
                </button>
                <button
                  onClick={async () => {
                    try {
                      await downloadAsWord(generatedContent, sanitizeFilename(`${docType}_${clientData.name}`));
                      toast.success('Word baixado!');
                    } catch (e) { toast.error('Erro ao gerar Word.'); }
                  }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-all"
                >
                  <span className="material-symbols-outlined text-sm">description</span> Word
                </button>
                <button onClick={() => setGeneratedContent('')} className="ml-2 text-slate-400 hover:text-red-500 transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 p-12 overflow-y-auto custom-scrollbar bg-white text-slate-900">
              <article
                className="prose prose-lg max-w-none font-sans prose-p:text-justify prose-p:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: generatedContent }}
              />
              <style>{`
                td:first-child { background-color: #f8f9fa; font-weight: bold; width: 30%; }
              `}</style>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CreateDocument;
