import OpenAI from 'openai';

// Recupera a chave do .env
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

// Exportação Nomeada (export const ...) para casar com o import { openAIService }
export const openAIService = {
  async generate(prompt: string): Promise<string> {
    if (!apiKey) {
      throw new Error("VITE_OPENAI_API_KEY não encontrada. Configure na Vercel ou no .env");
    }

    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Necessário pois estamos rodando no front-end (Vite)
      });

      const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: prompt }],
        model: "gpt-4o-mini", // ou "gpt-3.5-turbo" se preferir economia
        temperature: 0.7,
      });

      return completion.choices[0].message.content || "Erro: A IA não retornou conteúdo.";
      
    } catch (error) {
      console.error("Erro na API da OpenAI:", error);
      throw new Error("Falha ao gerar texto com OpenAI.");
    }
  }
};