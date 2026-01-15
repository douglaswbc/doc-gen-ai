import { GoogleGenerativeAI } from "@google/generative-ai";

// Recupera a chave do .env
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Exportação Nomeada (export const ...) para casar com o import { geminiService }
export const geminiService = {
  async generate(prompt: string): Promise<string> {
    if (!API_KEY) {
      throw new Error("VITE_GEMINI_API_KEY não encontrada nas variáveis de ambiente.");
    }

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      // Utiliza o modelo Gemini Pro (texto)
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      console.error("Erro na API do Gemini:", error);
      throw new Error("Falha ao gerar texto com Gemini AI.");
    }
  }
};