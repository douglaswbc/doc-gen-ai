import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { useCreateDocumentLogic } from '../hooks/useCreateDocumentLogic';
import { AIProvider } from '../services/ai/orchestrator';
import { downloadAsPDF, downloadAsWord, sanitizeFilename } from '../utils/documentExport';
import Stepper from '../components/Stepper';
import { useAutoSave } from '../hooks/useAutoSave';

const CreateDocument: React.FC = () => {
  const navigate = useNavigate();
  const {
    user, profile, agents, generatedContent, isGenerating, progress, progressStatus,
    signers, setSigners, selectedSignerIds, setSelectedSignerIds,
    isSignerDropdownOpen, setIsSignerDropdownOpen,
    clientData, setClientData, suggestions, showSuggestions, setShowSuggestions, isSearching,
    docType, setDocType, isSaving, setIsSaving,
    initialAgentTitle, sphereParam, availableTasks,
    generate, incrementUsage, fetchProfile, isLimitReached, searchClients, setProgress, setProgressStatus
  } = useCreateDocumentLogic();

  const viewerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Stepper para indicar progresso do formulário
  const [currentStep, setCurrentStep] = useState(1);
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
    const signersInfo = selectedSignersList.length > 0 ? `
      ADVOGADOS RESPONSÁVEIS (LISTAR TODOS NO RODAPÉ/ASSINATURA):
      ${selectedSignersList.map(s => `- ${s.full_name} (OAB: ${s.oab || 'N/D'})`).join('\n')}
    ` : 'ADVOGADO: Deixar campo para assinatura.';

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
      DADOS DO FILHO(A):
      - Nome: ${clientData.child_name}
      - CPF: ${clientData.child_cpf}
      - Data Nasc: ${clientData.child_birth_date}
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

  const saveClientToDb = async () => {
    if (!user || !clientData.name) return null;

    // Convert empty strings to null for DATE columns to avoid Supabase 400 errors
    // Prepare payload for DB: map first child into DB columns and remove UI-only `children` array
    const payload: any = { ...clientData, user_id: user.id, updated_at: new Date().toISOString() };
    const dateFields = ['birth_date', 'child_birth_date', 'der', 'denied_date'];

    // Remove UI-only fields before upsert
    delete payload.children;

    // Remove address fields not present in DB to avoid Supabase errors
    delete payload.city;
    delete payload.state;
    delete payload.zip_code;
    delete payload.neighborhood;

    // Ensure rural_start_date is null unless it's a valid YYYY-MM-DD date
    const ruralVal = payload.rural_start_date;
    const isIsoDate = typeof ruralVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ruralVal);
    if (!isIsoDate) {
      if (ruralVal && ruralVal !== '') {
        // append free-text to rural_tasks to preserve info
        payload.rural_tasks = [payload.rural_tasks || '', `Início atividade rural: ${ruralVal}`].filter(Boolean).join('\n');
      }
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
      // Upsert client row (do NOT include children here; children are persisted via the backend endpoint)
      const { data, error } = await supabase.from('clients').upsert(payload).select().single();
      if (error) {
        console.error('Supabase error saving client:', error);
        throw error;
      }

      // Persist children to normalized table via backend endpoint
      try {
          if (clientData.children && Array.isArray(clientData.children) && clientData.children.length > 0) {
          const sessionRes = await supabase.auth.getSession();
          const token = sessionRes?.data?.session?.access_token;
          const childrenBody = clientData.children.map((c: any) => ({ name: c.name || null, cpf: c.cpf || null, birth_date: c.birth_date || null }));
          const apiBase = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const resp = await fetch(`${apiBase}/api/clients/${data.id}/children`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(childrenBody)
          });
          if (!resp.ok) {
            const text = await resp.text().catch(() => 'no body');
            console.error('Failed to persist children:', resp.status, text);
          }

          // Also try to persist children JSON into clients.children column (if table has that column)
          try {
            const { data: updData, error: updError } = await supabase.from('clients').update({ children: childrenBody }).eq('id', data.id).select().single();
            if (updError) {
              // If column doesn't exist, supabase will return an error — ignore silently
              console.warn('Could not update clients.children (maybe column missing):', updError.message || updError);
            }
          } catch (err) {
            console.error('Error updating clients.children column:', err);
          }
        }
      } catch (err) {
        console.error('Error calling children endpoint:', err);
      }

      return data;
    } catch (error) {
      toast.error('Erro ao salvar dados do cliente.');
      return null;
    }
  };

  const handleGenerate = async () => {
    if (isLimitReached) { toast.error('Limite do plano atingido.'); return; }
    if (selectedSignerIds.length === 0) { toast.warning('Selecione pelo menos um advogado para assinar.'); return; }
    let selectedAgent = agents.find(a => a.name === initialAgentTitle);
    if (!selectedAgent && sphereParam) selectedAgent = agents.find(a => a.sphere.toLowerCase() === sphereParam.toLowerCase());
    if (!selectedAgent && agents.length > 0) selectedAgent = agents[0];
    if (!selectedAgent) { toast.error('Erro: Nenhum agente de IA encontrado.'); return; }
    const savedClient = await saveClientToDb();
    if (savedClient) setClientData(prev => ({ ...prev, id: savedClient.id }));
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
      // Campos de controle e rastreabilidade
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
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { font-family: 'Times New Roman', serif; font-size: 12pt; } p { text-align: justify; line-height: 1.5; } table { width: 100%; border-collapse: collapse; border: 1px solid black; } th, td { border: 1px solid black; padding: 8px; }</style></head><body>${generatedContent}</body></html>`;
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
    <div className="flex-1 w-full max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row gap-8 h-full">

        {/* === FORMULÁRIO === */}
        <div className="w-full lg:w-1/2 flex flex-col gap-6 h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar pr-2">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>CPF</label>
                    <input
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={11}
                      value={clientData.cpf}
                      onChange={e => setClientData({ ...clientData, cpf: e.target.value.replace(/\D/g,'').slice(0,11) })}
                      className={inputClass}
                      placeholder="00000000000"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>RG</label>
                    <input value={clientData.rg} onChange={e => setClientData({ ...clientData, rg: e.target.value })} className={inputClass} placeholder="Número" />
                  </div>
                  <div>
                    <label className={labelClass}>Órgão Exp.</label>
                    <input value={clientData.rg_issuer} onChange={e => setClientData({ ...clientData, rg_issuer: e.target.value })} className={inputClass} placeholder="Ex: SSP/PA" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                    <label className={labelClass}>CEP</label>
                    <div className="flex gap-2">
                      <input value={clientData.zip_code} onChange={e => setClientData({ ...clientData, zip_code: e.target.value.replace(/\D/g,'') })} className={`${inputClass} md:flex-1`} placeholder="00000000" />
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
                <button type="button" onClick={() => {
                  setClientData(prev => ({ ...prev, children: [...(prev.children || []), { name: '', cpf: '', birth_date: '' }] }));
                }} className="text-sm text-primary font-bold">Adicionar Criança</button>
              </div>

              <div className="space-y-4">
                {(clientData.children || []).map((child, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-3">
                      <label className={labelClass}>Nome da Criança</label>
                      <input
                        placeholder="Nome completo da criança"
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

                    <div>
                      <label className={labelClass}>CPF</label>
                      <input
                        inputMode="numeric"
                        pattern="\\d*"
                        maxLength={11}
                        placeholder="00000000000"
                        value={child.cpf}
                        onChange={e => {
                          const clean = e.target.value.replace(/\D/g,'').slice(0,11);
                          const next = [...(clientData.children || [])];
                          next[idx] = { ...next[idx], cpf: clean };
                          const base: any = { children: next };
                          if (idx === 0) { base.child_cpf = clean; }
                          setClientData(prev => ({ ...prev, ...base }));
                        }}
                        className={inputClass}
                      />
                    </div>

                    <div>
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

                    <div className="md:col-span-1 flex gap-2">
                      { (clientData.children || []).length > 1 && (
                        <button type="button" onClick={() => {
                          const next = [...(clientData.children || [])];
                          next.splice(idx,1);
                          const first = next[0] || { name: '', cpf: '', birth_date: '' };
                          setClientData(prev => ({ ...prev, children: next, child_name: first.name, child_cpf: first.cpf, child_birth_date: first.birth_date }));
                        }} className="px-3 py-2 rounded-lg bg-red-600 text-white">Remover</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>


            {/* DADOS DO BENEFÍCIO (Expandido) */}
            <div>
              <h3 className="text-primary font-bold flex items-center gap-2 mb-4 mt-6"><span className="material-symbols-outlined">assignment</span> Dados do Benefício / Processo</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClass}>DER (Data Entrada)</label><input type="date" value={clientData.der} onChange={e => setClientData({ ...clientData, der: e.target.value })} className={inputClass} /></div>
                  <div>
                    <label className={labelClass}>NB</label>
                    <input
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={10}
                      value={clientData.nb}
                      onChange={e => setClientData({ ...clientData, nb: e.target.value.replace(/\D/g,'').slice(0,10) })}
                      placeholder="Ex: 1234567890"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Situação</label>
                    <select value={clientData.benefit_status} onChange={e => setClientData({ ...clientData, benefit_status: e.target.value })} className={inputClass}>
                      <option value="indeferido">Indeferido</option><option value="cessado">Cessado</option><option value="em análise">Em Análise</option><option value="ativo">Ativo</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Data do Indeferimento</label><input type="date" value={clientData.denied_date} onChange={e => setClientData({ ...clientData, denied_date: e.target.value })} className={inputClass} /></div>
                </div>
                <div><label className={labelClass}>Motivo da Decisão</label><textarea value={clientData.decision_reason} onChange={e => setClientData({ ...clientData, decision_reason: e.target.value })} className={inputClass} placeholder="Ex: Falta de carência" rows={4} /></div>

                {/* NOVOS CAMPOS ESPECÍFICOS */}
                <div><label className={labelClass}>Trabalhou até quando antes do parto?</label><input value={clientData.activity_before_birth} onChange={e => setClientData({ ...clientData, activity_before_birth: e.target.value })} className={inputClass} placeholder="Ex: 10 meses e 15 dias" /></div>
                <div><label className={labelClass}>Período de segurado especial declarado</label><input value={clientData.special_insured_period} onChange={e => setClientData({ ...clientData, special_insured_period: e.target.value })} className={inputClass} placeholder="Ex: 01/01/2015 a 10/05/2024" /></div>
                <div><label className={labelClass}>Ponto Controvertido</label><textarea value={clientData.controversial_point} onChange={e => setClientData({ ...clientData, controversial_point: e.target.value })} className={inputClass} placeholder="Ex: Qualidade de segurado" rows={2} /></div>

                <div className="grid grid-cols-1 gap-4">
                  <div><label className={labelClass}>Benefício Anterior Concedido?</label><input value={clientData.previous_benefit} onChange={e => setClientData({ ...clientData, previous_benefit: e.target.value })} className={inputClass} placeholder="Não consta" /></div>
                  <div><label className={labelClass}>Período Reconhecido CNIS?</label><input value={clientData.cnis_period} onChange={e => setClientData({ ...clientData, cnis_period: e.target.value })} className={inputClass} placeholder="Não consta" /></div>
                  <div><label className={labelClass}>Vínculo Urbano?</label><input value={clientData.urban_link} onChange={e => setClientData({ ...clientData, urban_link: e.target.value })} className={inputClass} placeholder="Nunca teve" /></div>
                </div>
              </div>
            </div>

            {/* HISTÓRICO */}
            <div>
              <h3 className="text-primary font-bold flex items-center gap-2 mb-4 mt-6"><span className="material-symbols-outlined">work_history</span> Histórico e Atividade</h3>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Início atividade rural</label>
                  <input
                    type="text"
                    value={clientData.rural_start_date ?? ''}
                    onChange={e => setClientData({ ...clientData, rural_start_date: e.target.value })}
                    className={inputClass}
                    placeholder="Ex: Janeiro/2015 ou descrição (p.ex. início aos 15 anos)"
                  />
                </div>
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

            <div className="pt-6">
              {isLimitReached ? (
                <a href={MERCADO_PAGO_LINK} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"><span className="material-symbols-outlined mr-2">rocket_launch</span> Fazer Upgrade</a>
              ) : (
                <button onClick={handleGenerate} disabled={isGenerating} className={`flex items-center justify-center w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:shadow-primary/30 transition-all ${isGenerating ? 'opacity-70 cursor-wait' : 'hover:-translate-y-1'}`}>
                  {isGenerating ? <><span className="material-symbols-outlined animate-spin mr-2">progress_activity</span> Gerando Documento...</> : <><span className="material-symbols-outlined mr-2">auto_awesome</span> Gerar Documento com IA</>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* === VISUALIZADOR ATUALIZADO === */}
        <div className="w-full lg:w-1/2 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[calc(100vh-120px)] lg:sticky lg:top-24">

          {/* Estado 1: Aguardando (Vazio) */}
          {!generatedContent && !isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center animate-in fade-in zoom-in">
              <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4"><span className="material-symbols-outlined text-4xl opacity-50">description</span></div>
              <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">Aguardando Dados</h3>
              <p className="text-sm max-w-xs mt-2">Preencha o formulário completo ao lado para gerar a peça.</p>
            </div>
          )}

          {/* Estado 2: Carregando (Barra de Progresso Simulada) */}
          {isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                {/* Ícone de Cérebro/Processamento */}
                <div className="relative">
                  <span className="material-symbols-outlined text-6xl text-primary animate-pulse">psychology</span>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full">
                  <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                    <span>Processando...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-3 animate-fade-in">
                    {progressStatus}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Estado 3: Conteúdo Gerado (Instantâneo) */}
          {generatedContent && !isGenerating && (
            <>
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-xl">
                <span className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500">check_circle</span> Minuta Concluída
                </span>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={handleSaveDocument} disabled={isSaving} className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded font-bold transition-colors">
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button onClick={handleCopy} className="flex items-center gap-1 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white px-3 py-1.5 rounded font-bold transition-colors">
                    <span className="material-symbols-outlined text-sm">content_copy</span> Copiar
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await downloadAsPDF(generatedContent, sanitizeFilename(`${docType}_${clientData.name}`));
                        toast.success('PDF baixado!');
                      } catch (e) {
                        toast.error('Erro ao gerar PDF.');
                      }
                    }}
                    className="flex items-center gap-1 text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-bold transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span> PDF
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await downloadAsWord(generatedContent, sanitizeFilename(`${docType}_${clientData.name}`));
                        toast.success('Word baixado!');
                      } catch (e) {
                        toast.error('Erro ao gerar Word.');
                      }
                    }}
                    className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-bold transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">description</span> Word
                  </button>
                </div>
              </div>

              {/* Área do Documento (Com ref para auto-scroll) */}
              <div
                ref={viewerRef}
                className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white text-slate-900 shadow-inner"
              >
                <article
                  className="prose prose-sm max-w-none font-serif prose-p:my-3 prose-headings:font-bold prose-a:text-blue-600"
                  dangerouslySetInnerHTML={{ __html: generatedContent }}
                />

                {/* Estilos da Tabela */}
                <style>{`
                            table { width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 14px; page-break-inside: avoid; }
                            th, td { border: 1px solid #000; padding: 10px; text-align: left; vertical-align: middle; }
                            /* Força a primeira coluna (títulos) a ter fundo cinza e negrito */
                            td:first-child { background-color: #f8f9fa; font-weight: bold; width: 30%; }
                            p { line-height: 1.6; text-align: justify; margin-bottom: 12px; }
                        `}</style>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateDocument;