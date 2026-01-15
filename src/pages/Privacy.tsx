import React from 'react';
import { Link } from 'react-router-dom';

const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white py-12 px-6">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary font-bold mb-8 hover:underline">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Voltar para Início
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-black mb-8">Política de Privacidade</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-sm text-slate-500">Última atualização: {new Date().toLocaleDateString()}</p>

          <p className="mt-4">
            A sua privacidade é importante para nós. É política do PrevAI respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site PrevAI e outros sites que possuímos e operamos.
          </p>

          <h3 className="text-xl font-bold mt-8 mb-4">1. Informações que Coletamos</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Dados de Conta:</strong> Nome, e-mail e informações de faturamento para gestão da sua assinatura.</li>
            <li><strong>Dados de Uso:</strong> Informações sobre como você interage com o sistema (logs de acesso, quantidade de documentos gerados) para melhoria do serviço.</li>
            <li><strong>Dados de Terceiros (Clientes):</strong> Informações que você insere na plataforma para a geração de documentos (ex: nome, CPF e fatos do caso de seus clientes).</li>
          </ul>

          <h3 className="text-xl font-bold mt-8 mb-4">2. Uso das Informações</h3>
          <p>Utilizamos os dados coletados estritamente para:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Operar e manter o serviço PrevAI;</li>
            <li>Processar suas solicitações de geração de documentos via Inteligência Artificial;</li>
            <li>Melhorar, personalizar e expandir nossos serviços;</li>
            <li>Enviar e-mails relacionados a conta, faturas e atualizações do sistema.</li>
          </ul>

          <h3 className="text-xl font-bold mt-8 mb-4">3. Segurança e Armazenamento</h3>
          <p>Valorizamos sua confiança em nos fornecer suas informações pessoais e utilizamos meios comercialmente aceitáveis para protegê-las. Utilizamos criptografia SSL, banco de dados seguro (Supabase) e autenticação robusta. No entanto, lembre-se que nenhum método de transmissão pela internet ou armazenamento eletrônico é 100% seguro.</p>

          <h3 className="text-xl font-bold mt-8 mb-4">4. Compartilhamento de Dados</h3>
          <p>Não vendemos, trocamos ou transferimos suas informações pessoais para terceiros não afiliados. Isso não inclui terceiros de confiança que nos auxiliam na operação do nosso site (ex: processadores de pagamento e APIs de Inteligência Artificial), desde que essas partes concordem em manter essas informações confidenciais.</p>

          <h3 className="text-xl font-bold mt-8 mb-4">5. Seus Direitos (LGPD)</h3>
          <p>Você tem o direito de solicitar o acesso, a correção ou a exclusão de seus dados pessoais armazenados em nossos sistemas. Você pode exercer esses direitos a qualquer momento através das configurações da sua conta ou entrando em contato com nosso suporte.</p>

          <h3 className="text-xl font-bold mt-8 mb-4">6. Contato</h3>
          <p>Se você tiver alguma dúvida sobre nossa Política de Privacidade, entre em contato conosco através do e-mail de suporte disponível na plataforma.</p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;