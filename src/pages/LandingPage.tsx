import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white transition-colors selection:bg-primary selection:text-white font-sans">
      
      {/* === NAVBAR PÚBLICA === */}
      <nav className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
             <div className="size-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
               <span className="material-symbols-outlined text-2xl">smart_toy</span>
             </div>
             <span className="text-2xl font-black tracking-tighter">PREV<span className="text-primary">AI</span></span>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden md:block font-bold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
              Entrar
            </Link>
            <Link to="/register" className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-full font-bold transition-all shadow-lg shadow-primary/25 hover:-translate-y-0.5">
              Criar Conta Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* === HERO SECTION === */}
      <header className="relative pt-20 pb-32 overflow-hidden">
        {/* Efeito de Fundo (Glow) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[120px] -z-10" />

        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-6 border border-blue-100 dark:border-blue-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Nova Inteligência Artificial Jurídica
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 dark:from-white dark:via-blue-200 dark:to-white">
            Sua Advocacia Previdenciária <br className="hidden md:block" />
            <span className="text-primary">Mais Rápida e Inteligente.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Crie petições iniciais, recursos e manifestações completas em minutos. 
            Nossa IA é treinada especificamente para o Direito Rural, Urbano e Administrativo.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl font-bold text-lg shadow-xl shadow-primary/30 hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">rocket_launch</span>
              Começar Agora
            </Link>
            <a href="#demo" className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">play_circle</span>
              Ver Demo
            </a>
          </div>

          {/* Mockup do Sistema */}
          <div className="mt-20 relative mx-auto max-w-5xl">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20"></div>
            <div className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden aspect-video flex items-center justify-center">
               {/* Aqui você pode por um print real depois */}
               <div className="text-center">
                  <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">screenshot_monitor</span>
                  <p className="text-slate-500 font-medium">Interface do Sistema PrevAI</p>
               </div>
            </div>
          </div>
        </div>
      </header>

      {/* === CARACTERÍSTICAS (Grid) === */}
      <section className="py-24 bg-white dark:bg-[#0f1117]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Poder Jurídico Especializado</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Não é um gerador de texto genérico. O PrevAI possui agentes treinados nas especificidades de cada benefício.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all group">
              <div className="size-14 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">agriculture</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Especialista Rural</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Petições focadas na Súmula 149 do STJ, provas materiais e testemunhais para segurados especiais e pescadores.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all group">
              <div className="size-14 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">location_city</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Esfera Urbana & BPC</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Aposentadorias por tempo de contribuição, idade urbana e LOAS/BPC com fundamentação atualizada.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all group">
              <div className="size-14 bg-purple-100 dark:bg-purple-900/20 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">psychology</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Agentes Inteligentes</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                O sistema seleciona automaticamente o melhor "Agente de IA" com base no caso do seu cliente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* === COMO FUNCIONA (Passo a Passo) === */}
      <section className="py-24 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black mb-6">De horas para minutos. <br /> Simples assim.</h2>
                    <div className="space-y-8">
                        <div className="flex gap-4">
                            <div className="flex-none size-10 rounded-full bg-primary text-white font-bold flex items-center justify-center">1</div>
                            <div>
                                <h4 className="font-bold text-lg">Cadastre o Cliente</h4>
                                <p className="text-slate-500 dark:text-slate-400">Insira os dados básicos e a história do caso.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-none size-10 rounded-full bg-primary text-white font-bold flex items-center justify-center">2</div>
                            <div>
                                <h4 className="font-bold text-lg">Selecione o Módulo</h4>
                                <p className="text-slate-500 dark:text-slate-400">Escolha entre Judicial, Administrativo, Rural ou Urbano.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-none size-10 rounded-full bg-primary text-white font-bold flex items-center justify-center">3</div>
                            <div>
                                <h4 className="font-bold text-lg">IA Redige a Peça</h4>
                                <p className="text-slate-500 dark:text-slate-400">Em segundos, sua petição está pronta para revisão e protocolo.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-8 aspect-square flex items-center justify-center relative">
                    <span className="material-symbols-outlined text-[10rem] text-slate-300 dark:text-slate-700 animate-pulse">auto_awesome</span>
                    {/* Elementos flutuantes decorativos */}
                    <div className="absolute top-10 right-10 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl animate-bounce duration-[3000ms]">
                        <span className="text-sm font-bold flex items-center gap-2"><span className="text-green-500 material-symbols-outlined text-sm">check_circle</span> Petição Gerada</span>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* === CTA FINAL === */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
            <div className="bg-primary rounded-3xl p-12 md:p-20 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black mb-6">Pronto para modernizar seu escritório?</h2>
                    <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">Junte-se a advogados que já estão economizando tempo e aumentando a qualidade das suas peças processuais.</p>
                    <Link to="/register" className="inline-block bg-white text-primary px-10 py-4 rounded-xl font-bold text-xl shadow-xl hover:bg-blue-50 transition-all hover:-translate-y-1">
                        Criar Conta Gratuitamente
                    </Link>
                    <p className="mt-6 text-sm text-blue-200 opacity-80">Não requer cartão de crédito para testar.</p>
                </div>
            </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-12 bg-white dark:bg-[#0f1117]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                 <span className="text-xl font-black tracking-tighter">PREV<span className="text-primary">AI</span></span>
            </div>
            <div className="text-slate-500 text-sm">
                &copy; {new Date().getFullYear()} PrevAI. Todos os direitos reservados.
            </div>
            <div className="flex gap-6">
                <Link to="/terms" className="text-slate-500 hover:text-primary">Termos</Link>
                <Link to="/privacy" className="text-slate-500 hover:text-primary">Privacidade</Link>
                <a href="mailto:suporte@prevai.com.br" className="text-slate-500 hover:text-primary">Suporte</a>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;