import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    documents_limit: number;
    checkout_url: string;
    is_active: boolean;
    is_free: boolean;
}

const Plans: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [saving, setSaving] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('0');
    const [limit, setLimit] = useState('5');
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isFree, setIsFree] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .order('price', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar planos.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (plan?: Plan) => {
        if (plan) {
            setEditingPlan(plan);
            setName(plan.name);
            setDescription(plan.description || '');
            setPrice(plan.price.toString());
            setLimit(plan.documents_limit.toString());
            setCheckoutUrl(plan.checkout_url || '');
            setIsActive(plan.is_active);
            setIsFree(plan.is_free);
        } else {
            setEditingPlan(null);
            setName('');
            setDescription('');
            setPrice('0');
            setLimit('5');
            setCheckoutUrl('');
            setIsActive(true);
            setIsFree(false);
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!name) return toast.warning('O nome do plano é obrigatório.');
        setSaving(true);

        const planData = {
            name,
            description,
            price: parseFloat(price),
            documents_limit: parseInt(limit),
            checkout_url: checkoutUrl,
            is_active: isActive,
            is_free: isFree
        };

        try {
            if (editingPlan) {
                const { error } = await supabase
                    .from('plans')
                    .update(planData)
                    .eq('id', editingPlan.id);
                if (error) throw error;
                toast.success('Plano atualizado!');
            } else {
                const { error } = await supabase
                    .from('plans')
                    .insert([planData]);
                if (error) throw error;
                toast.success('Novo plano criado!');
            }
            setShowModal(false);
            fetchPlans();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar plano.');
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('plans')
                .update({ is_active: !currentStatus })
                .eq('id', id);
            if (error) throw error;
            fetchPlans();
            toast.success('Status atualizado!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao atualizar status.');
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">Gestão de Planos</h1>
                    <p className="text-slate-500">Configure os limites e preços para os escritórios.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold hover:bg-primary/90 transition-all shadow-lg active:scale-95">
                    <span className="material-symbols-outlined">add_card</span>
                    Novo Plano
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex flex-col items-center justify-center p-12">
                        <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">progress_activity</span>
                        <p className="text-slate-500">Carregando planos...</p>
                    </div>
                ) : plans.length === 0 ? (
                    <div className="col-span-full bg-white dark:bg-card-dark p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">receipt_long</span>
                        <p className="text-slate-500">Nenhum plano cadastrado.</p>
                    </div>
                ) : (
                    plans.map((plan) => (
                        <div key={plan.id} className={`bg-white dark:bg-card-dark rounded-2xl border transition-all ${plan.is_active ? 'border-slate-200 dark:border-slate-800' : 'border-dashed border-slate-300 dark:border-slate-700 opacity-60'}`}>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{plan.name}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${plan.is_free ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {plan.is_free ? 'Gratuito' : 'Premium'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModal(plan)} className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors flex items-center justify-center">
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                        </button>
                                        <button onClick={() => toggleStatus(plan.id, plan.is_active)} className={`size-8 rounded-lg flex items-center justify-center transition-colors ${plan.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            <span className="material-symbols-outlined text-sm">{plan.is_active ? 'visibility' : 'visibility_off'}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium tracking-tight">Preço:</span>
                                        <span className="font-black text-slate-900 dark:text-white">R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium tracking-tight">Limite Mensal:</span>
                                        <span className="font-black text-primary">{plan.documents_limit === 0 ? 'Ilimitado' : `${plan.documents_limit} docs`}</span>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                                    {plan.description || 'Sem descrição cadastrada.'}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de Criação / Edição */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-card-dark w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-100 dark:border-slate-700 overflow-hidden">

                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">analytics</span>
                                {editingPlan ? 'Editar Plano' : 'Novo Plano'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1 tracking-tight">Nome do Plano</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5 outline-none focus:ring-2 focus:ring-primary transition-all font-medium" placeholder="Ex: Escritório Pro" />
                                </div>
                                <div>
                                    <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1 tracking-tight">Preço (mensal)</label>
                                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5 outline-none focus:ring-2 focus:ring-primary transition-all font-medium" />
                                </div>
                                <div>
                                    <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1 tracking-tight">Documentos (0 = ILIM)</label>
                                    <input type="number" value={limit} onChange={e => setLimit(e.target.value)} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5 outline-none focus:ring-2 focus:ring-primary transition-all font-medium" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1 tracking-tight">Descrição Breve</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5 outline-none focus:ring-2 focus:ring-primary transition-all font-medium h-20 resize-none" placeholder="O que este plano oferece?"></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1 tracking-tight">URL de Checkout (Mercado Pago)</label>
                                <input type="url" value={checkoutUrl} onChange={e => setCheckoutUrl(e.target.value)} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5 outline-none focus:ring-2 focus:ring-primary transition-all font-medium" placeholder="https://www.mercadopago.com.br/..." />
                            </div>

                            <div className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="size-4 rounded border-slate-300 text-primary focus:ring-primary" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors uppercase">Plano Ativo</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" checked={isFree} onChange={e => setIsFree(e.target.checked)} className="size-4 rounded border-slate-300 text-primary focus:ring-primary" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors uppercase">É gratuito?</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-card-dark">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-bold transition-colors uppercase text-xs tracking-wider">Cancelar</button>
                            <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-primary text-white font-black rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20 active:scale-95 transition-all text-xs uppercase tracking-wider">
                                {saving ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">save</span>}
                                {saving ? 'Salvando...' : 'Salvar Plano'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Plans;
