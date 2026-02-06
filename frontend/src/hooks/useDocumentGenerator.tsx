import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

export const useDocumentGenerator = () => {
  const { user, session } = useAuth();
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;

  // Função genérica para chamar o Backend Python
  const generate = async (
    agentName: string,      // Ex: 'Salário Maternidade - Agricultora'
    agentSlug: string,      // Ex: 'salario-maternidade-agricultora'
    docType: string,
    clientName: string,
    details: string,
    provider: string = 'openai',
    systemInstruction: string,
    clientData: any         // Objeto completo do cliente
  ) => {

    setIsGenerating(true);

    try {
      // 1. Validação básica
      if (!clientName || !details) {
        toast.warn('Por favor, preencha os dados do cliente e o relato dos fatos.');
        setIsGenerating(false);
        return null;
      }
      // Verifica se existe sessão ativa
      if (!session?.access_token) {
        toast.error('Sessão expirada. Faça login novamente.');
        setIsGenerating(false);
        return null;
      }

      // 2. Chamada à API Python      
      // Certifique-se que seu backend está rodando em localhost:8000
      const response = await fetch(`${API_URL}/api/agents/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          agentName,
          agentSlug,
          docType,
          clientName,
          details,
          systemInstruction,
          clientData: {
            ...clientData,
            name: clientName, // Garante que o nome atualizado vai
            details: details  // Garante que o relato atualizado vai
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erro no servidor Python');
      }

      // 3. Recebe o JSON estruturado do Python
      const result = await response.json();

      // 4. Registra estatística de uso no Supabase
      if (user) {
        await supabase.rpc('increment_documents_generated', { user_uuid: user.id });
      }

      toast.success('Documento gerado com inteligência artificial!');
      setIsGenerating(false);

      return result; // Retorna o JSON para o hook pai renderizar o template

    } catch (err) {
      console.error("❌ Erro ao conectar com Python:", err);
      toast.error('Erro ao gerar. Verifique se o servidor Python está rodando.');
      setIsGenerating(false);
      return null;
    }
  };

  return {
    generatedContent,
    setGeneratedContent,
    isGenerating,
    generate
  };
};