import React from 'react';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    usage: {
        generated: number;
        limit: number;
        plan: string;
    };
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, usage }) => {
    if (!isOpen) return null;

    const MERCADO_PAGO_LINK = "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=2c938084918e6c73019191e32d1f021c";

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="bg-white dark:bg-[#161b22] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800 animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Barra de Gradiente Superior */}
                <div className="h-2 w-full bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600"></div>

                <div className="p-8 text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>

                    {/* Icone com animação suave */}
                    <div className="size-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-xl shadow-blue-500/20 transform -rotate-6 animate-in slide-in-from-bottom-4 duration-500">
                        <span className="material-symbols-outlined text-4xl text-white">rocket_launch</span>
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                        Limite do Plano <br /> {usage.plan.toUpperCase()} Atingido!
                    </h2>

                    <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm px-4">
                        Seu escritório já gerou <b>{usage.generated} de {usage.limit}</b> rascunhos jurídicos este mês. Prepare-se para o próximo nível.
                    </p>

                    <div className="space-y-3 mb-8 text-left">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                            <div className="size-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-sm">check</span>
                            </div>
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Gerações **Ilimitadas** de Petições e Cálculos.</p>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                            <div className="size-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-sm">check</span>
                            </div>
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Acesso antecipado a todos os Novos Agentes IA.</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <a
                            href={MERCADO_PAGO_LINK}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-xl">bolt</span>
                            DESBLOQUEAR ACESSO ILIMITADO
                        </a>

                        <button
                            onClick={onClose}
                            className="text-[10px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-[0.2em]"
                        >
                            Talvez depois
                        </button>
                    </div>
                </div>

                {/* Rodapé Informativo */}
                <div className="bg-slate-50 dark:bg-slate-900/80 p-4 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-[10px] text-slate-400 font-medium">Assinatura mensal. Sem fidelidade, cancele a qualquer momento.</p>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
