import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { ClientData } from '../types'; // Importando a tipagem correta

export const useDocumentGenerator = () => {
  const { session } = useAuth();
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
    clientData: ClientData  // Tipagem forte aqui
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
          // systemInstruction é ignorado pelo backend (pois ele busca do DB), mas não gera erro enviar
          clientData: {
            ...clientData,
            name: clientName, // Sincroniza nome
            details: details  // Sincroniza detalhes
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erro no servidor Python');
      }

      // 3. Recebe o JSON estruturado do Python
      const result = await response.json();

      toast.success('Documento gerado com inteligência artificial!');
      setIsGenerating(false);

      return result; // Retorna o JSON para o hook pai renderizar o template

    } catch (err: any) {
      console.error("❌ Erro ao conectar com Python:", err);
      // Mensagem de erro mais amigável
      const msg = err.message || 'Erro desconhecido';
      toast.error(`Erro ao gerar: ${msg}`);
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