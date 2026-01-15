import { useState } from 'react';
import { orchestratorService, AIProvider } from '../services/ai/orchestrator';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export const useDocumentGenerator = () => {
  const { user } = useAuth();
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Assinatura atualizada para receber todos os dados necessários
  const generate = async (
    agentType: string,      // Ex: 'salario_maternidade'
    docType: string, 
    clientName: string, 
    details: string,
    provider: AIProvider = 'openai',
    promptTemplate: string, // OBRIGATÓRIO: A instrução do sistema (System Prompt)
    clientData: any         // OBRIGATÓRIO: O objeto completo do cliente para cálculos e validações
  ) => {
    
    // Validações Básicas
    if (!clientName || !details) {
      toast.warn('Por favor, preencha todos os campos obrigatórios.');
      return null;
    }

    if (!promptTemplate) {
      console.error("Erro: Prompt Template está vazio/undefined.");
      toast.error('Erro de Configuração: O Agente selecionado não possui instruções (System Prompt).');
      return null;
    }
    
    setIsGenerating(true);
    // setGeneratedContent(''); // Opcional: limpar conteúdo anterior para evitar flicker

    try {
      console.log(`🚀 Iniciando geração com Agente: ${agentType}`);

      // Chamada ao Orquestrador
      const result = await orchestratorService.processDemand({
        agentType,
        provider,
        promptTemplate,   // Passando o prompt corretamente para o replace
        clientData,       // Passando os dados para cálculos
        variables: {
          clientName,
          docType,
          details,
          legalContext: '' // Será preenchido pelo orquestrador via RAG
        },
      });
      
      // Lógica de Retorno
      // Se for string (erro ou fallback), define direto no estado.
      if (typeof result === 'string') {
          setGeneratedContent(result);
      }
      // Se for objeto (JSON), não setamos aqui. O useCreateDocumentLogic vai pegar o retorno
      // e usar o template.ts para montar o HTML.

      // Incrementa estatísticas
      if (user) {
        await supabase.rpc('increment_documents_generated', { user_uuid: user.id });
      }

      toast.success(`Dados gerados com sucesso! Montando documento...`);
      setIsGenerating(false);
      
      return result; // Retorna os dados para o hook pai processar

    } catch (err) {
      console.error("❌ Erro no useDocumentGenerator:", err);
      toast.error('Erro ao processar solicitação. Verifique o console.');
      setIsGenerating(false);
      return null;
    }
  };

  return {
    generatedContent,
    setGeneratedContent, // Exposto para permitir override (HTML final)
    isGenerating,
    generate
  };
};