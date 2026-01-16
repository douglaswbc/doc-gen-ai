import React from 'react';
import { Link } from 'react-router-dom';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white py-12 px-6">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary font-bold mb-8 hover:underline">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Voltar para Início
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-black mb-8">Termos de Uso</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-sm text-slate-500">Última atualização: {new Date().toLocaleDateString()}</p>

          <h3 className="text-xl font-bold mt-8 mb-4">1. Aceitação dos Termos</h3>
          <p>Ao acessar e usar o PrevAI ("Serviço"), você concorda em cumprir estes Termos de Uso e todas as leis aplicáveis. Se você não concordar com algum destes termos, está proibido de usar ou acessar este site.</p>

          <h3 className="text-xl font-bold mt-8 mb-4">2. Descrição do Serviço</h3>
          <p>O PrevAI é uma ferramenta de inteligência artificial projetada para auxiliar advogados e profissionais do direito na redação de documentos previdenciários. O Serviço fornece minutas, sugestões de texto e organização de dados com base nas informações inseridas pelo usuário.</p>

          <h3 className="text-xl font-bold mt-8 mb-4">3. Responsabilidade do Profissional</h3>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800 my-6">
            <p className="font-bold text-yellow-800 dark:text-yellow-200 mb-2">Aviso Importante:</p>
            <p className="text-yellow-800/80 dark:text-yellow-200/80 text-sm">
              O PrevAI é uma ferramenta de apoio tecnológico e <strong>NÃO substitui o julgamento, revisão e responsabilidade técnica de um advogado</strong>. O usuário reconhece que é o único responsável pela revisão, validação, correção e protocolo final de qualquer documento gerado pela plataforma.
            </p>
          </div>
          <p>A PrevAI não se responsabiliza por perdas de prazos, indeferimentos de processos, erros materiais ou de direito decorrentes do uso não revisado das minutas geradas.</p>

          <h3 className="text-xl font-bold mt-8 mb-4">4. Propriedade Intelectual</h3>
          <p>O código-fonte, design, logotipos e a tecnologia de IA do PrevAI são propriedade exclusiva da nossa empresa. As minutas geradas para seus clientes tornam-se de sua propriedade intelectual para uso em seus processos.</p>

          <h3 className="text-xl font-bold mt-8 mb-4">5. Planos e Cancelamento</h3>
          <p>O acesso a funcionalidades premium requer uma assinatura ativa. Os pagamentos são processados de forma segura. Você pode cancelar sua assinatura a qualquer momento através do painel, mantendo o acesso até o fim do ciclo de faturamento vigente.</p>

          <h3 className="text-xl font-bold mt-8 mb-4">6. Limitação de Responsabilidade</h3>
          <p>Em nenhum caso a PrevAI ou seus fornecedores serão responsáveis por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro) decorrentes do uso ou da incapacidade de usar o serviço.</p>

          <h3 className="text-xl font-bold mt-8 mb-4">7. Modificações</h3>
          <p>Reservamo-nos o direito de revisar estes termos de serviço a qualquer momento sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses termos de serviço.</p>
        </div>
      </div>
    </div>
  );
};

export default Terms;