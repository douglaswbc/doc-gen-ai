import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    documents_limit: number;
    checkout_url: string;
}

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
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchPlans();
        }
    }, [isOpen]);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .eq('is_active', true)
                .eq('is_free', false)
                .order('price', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (error) {
            console.error('Erro ao buscar planos:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="bg-white dark:bg-[#161b22] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800 animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Barra de Gradiente Superior */}
                <div className="h-2 w-full bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600"></div>

                <div className="p-8 text-center relative max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>

                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                        Evolua seu Escritório! 🚀
                    </h2>

                    <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm px-4">
                        Seu escritório já gerou <b>{usage.generated} de {usage.limit}</b> rascunhos este mês. Escolha o plano ideal e continue produzindo sem limites.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {loading ? (
                            <div className="col-span-full py-12 flex flex-col items-center">
                                <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                                <p className="text-xs text-slate-500 mt-2">Buscando melhores ofertas...</p>
                            </div>
                        ) : plans.length === 0 ? (
                            <div className="col-span-full py-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                                <p className="text-sm text-slate-500 font-bold">Nenhuma oferta disponível no momento.</p>
                                <p className="text-xs text-slate-400">Entre em contato com o suporte.</p>
                            </div>
                        ) : (
                            plans.map((plan) => (
                                <div key={plan.id} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col hover:border-primary transition-all group">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tight">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1 mb-4">
                                        <span className="text-2xl font-black text-primary">R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">/ mês</span>
                                    </div>

                                    <div className="space-y-2 mb-6 text-left flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                                {plan.documents_limit === 0 ? 'Geração Ilimitada' : `Limite de ${plan.documents_limit} docs`}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                                            {plan.description}
                                        </p>
                                    </div>

                                    <a
                                        href={plan.checkout_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-bold rounded-xl hover:bg-primary hover:text-white hover:border-primary transition-all text-center text-xs uppercase tracking-wider"
                                    >
                                        Selecionar Plano
                                    </a>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="text-[10px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-[0.2em]"
                    >
                        Talvez depois
                    </button>
                </div>

                {/* Rodapé Informativo */}
                <div className="bg-slate-50 dark:bg-slate-900/80 p-4 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-[10px] text-slate-400 font-medium italic">🔐 Pagamento 100% seguro via Mercado Pago. Cancele quando quiser.</p>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
