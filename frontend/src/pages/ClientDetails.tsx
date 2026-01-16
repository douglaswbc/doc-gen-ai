import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfile } from '../hooks/useProfile'; // <--- Importe o useProfile
import { toast } from 'react-toastify';

const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Hooks
  const { permissions } = useProfile(); // <--- Extraia as permissões
  
  const [client, setClient] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      
      if (clientError) throw clientError;
      setClient(clientData);

      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docsData || []);

    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar prontuário.');
      navigate('/my-clients');
    } finally {
      setLoading(false);
    }
  };

  const startNewDocument = (path: string) => {
    if (!id) return;
    localStorage.setItem('temp_client_id_for_doc', id);
    navigate(path);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>;

  return (
    <div className="flex flex-col items-center w-full min-h-screen">
      <div className="w-full max-w-[1280px] px-4 md:px-10 py-8">
        
        {/* Header com Voltar */}
        <button onClick={() => navigate('/my-clients')} className="mb-6 flex items-center text-sm font-bold text-gray-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined mr-1">arrow_back</span> Voltar para Clientes
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Coluna Esquerda: Dados do Cliente */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm sticky top-24">
              <div className="flex items-center gap-4 mb-6">
                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-3xl">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{client.name}</h1>
                  <p className="text-sm text-gray-500">{client.cpf}</p>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Endereço</span>
                  <p className="text-gray-700 dark:text-gray-300">{client.address || 'Não informado'}</p>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Histórico Rural</span>
                  <p className="text-gray-700 dark:text-gray-300 line-clamp-3">{client.rural_tasks || 'Sem dados'}</p>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Detalhes do Caso</span>
                  <p className="text-gray-700 dark:text-gray-300 line-clamp-4">{client.case_details || 'Sem detalhes'}</p>
                </div>
              </div>

              {/* BOTÃO GERAR DOC: Apenas quem pode CRIAR documentos (Advogado/Estagiário/Dono) */}
              {permissions.canCreateDocuments && (
                  <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <button 
                      onClick={() => setIsModuleModalOpen(true)}
                      className="w-full btn-primary flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                      <span className="material-symbols-outlined">add_circle</span>
                      Gerar Novo Documento
                    </button>
                  </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: Histórico de Documentos */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              Histórico de Processos
            </h2>

            {documents.length === 0 ? (
               <div className="bg-gray-50 dark:bg-white/5 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
                 <p className="text-gray-500">Nenhum documento gerado para este cliente ainda.</p>
               </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="bg-white dark:bg-card-dark p-5 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-start gap-4">
                      <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{doc.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{doc.specialty} • {new Date(doc.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className={`px-2 py-1 text-xs font-bold rounded uppercase tracking-wider ${doc.status === 'Final' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {doc.status}
                        </span>
                        <button onClick={() => {navigator.clipboard.writeText(doc.content); toast.success('Copiado!')}} className="p-2 text-gray-400 hover:text-primary transition-colors" title="Copiar Conteúdo">
                          <span className="material-symbols-outlined">content_copy</span>
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE SELEÇÃO DE MÓDULO */}
      {isModuleModalOpen && permissions.canCreateDocuments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-card-dark w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Escolha o Módulo</h3>
              <button onClick={() => setIsModuleModalOpen(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => startNewDocument('/judicial')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group text-left"
              >
                <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined">gavel</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-primary">Demandas Judiciais</h4>
                  <p className="text-sm text-gray-500">Ações rurais, urbanas e recursos.</p>
                </div>
                <span className="material-symbols-outlined ml-auto text-gray-400 group-hover:text-primary">arrow_forward</span>
              </button>

              <button 
                disabled
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed text-left"
              >
                <div className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center">
                  <span className="material-symbols-outlined">assignment</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Administrativo (INSS)</h4>
                  <p className="text-sm text-gray-500">Em breve.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetails;