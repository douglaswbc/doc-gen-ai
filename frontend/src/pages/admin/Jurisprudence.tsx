import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { toast } from 'react-toastify';

interface Juris {
  id?: string;
  title: string;
  citation?: string;
  court?: string;
  date?: string;
  summary?: string;
  full_text?: string;
  tags?: string[];
  source_url?: string;
}

const JurisprudenceAdmin: React.FC = () => {
  const { profile, loading } = useProfile();
  const [items, setItems] = useState<Juris[]>([]);
  const [q, setQ] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<Juris | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading) fetchList();
  }, [loading]);

  const apiBase = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fetchList = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('jurisprudences')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);

      if (q) {
        query = query.ilike('title', `%${q}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar jurisprudência');
    } finally { setIsLoading(false); }
  };

  const handleImport = async () => {
    if (!selectedFile) { toast.warning('Selecione um arquivo CSV'); return; }
    try {
      const text = await selectedFile.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) throw new Error('Arquivo vazio ou inválido');

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map(line => {
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/"/g, ''));
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = values[i]; });
        return obj;
      });

      let inserted = 0;
      let updated = 0;
      toast.info('Iniciando importação...', { autoClose: false, toastId: 'importing-juris' });

      for (const row of rows) {
        const title = row.title || row.Título || row.Titulo;
        const court = row.court || row.Tribunal;
        const date = row.date || row.Data;
        const citation = row.citation || row.Citação || row.Citacao;
        const summary = row.summary || row.Resumo;
        const full_text = row.full_text || row['Texto completo'] || row.Conteúdo;
        const tags = row.tags ? row.tags.split(';').map((t: string) => t.trim()) : [];

        if (!title) continue;

        const payload = { title, court, date: date || null, citation, summary, full_text, tags };

        // Try to find by title and citation to avoid duplicates
        let query = supabase.from('jurisprudences').select('id');
        if (citation) {
          query = query.eq('citation', citation);
        } else {
          query = query.eq('title', title);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
          const { error } = await supabase.from('jurisprudences').update(payload).eq('id', existing.id);
          if (!error) updated++;
        } else {
          const { error } = await supabase.from('jurisprudences').insert([payload]);
          if (!error) inserted++;
        }
      }

      toast.dismiss('importing-juris-juris');
      toast.success(`Importação finalizada! Inseridos: ${inserted}, Atualizados: ${updated}`);
      setSelectedFile(null);
      fetchList();
    } catch (err: any) {
      toast.dismiss('importing-juris');
      console.error(err);
      toast.error('Erro ao importar: ' + (err.message || ''));
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm('Deseja remover este registro?')) return;
    try {
      const { error } = await supabase.from('jurisprudences').delete().eq('id', id);
      if (error) throw error;
      toast.success('Removido');
      fetchList();
    } catch (err) { console.error(err); toast.error('Erro ao remover'); }
  };

  const handleSave = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (!editing) return;
    try {
      const { id, ...payload } = editing;
      let error;
      if (id) {
        ({ error } = await supabase.from('jurisprudences').update(payload).eq('id', id));
      } else {
        ({ error } = await supabase.from('jurisprudences').insert([payload]));
      }
      if (error) throw error;
      toast.success('Salvo');
      setEditing(null);
      fetchList();
    } catch (err) { console.error(err); toast.error('Erro ao salvar'); }
  };

  if (loading) return <div>Carregando...</div>;
  if (profile?.role !== 'admin') return <div>Access denied</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Administração de Jurisprudência</h1>
            <p className="text-slate-500">Cadastre e gerencie decisões judiciais para a base de conhecimento.</p>
          </div>
          <button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm" onClick={() => setEditing({ title: '', tags: [] })}>
            <span>+ Nova Jurisprudência</span>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-primary rounded-full"></span>
                Busca & Filtros
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">Título ou Palavra-chave</label>
                  <div className="relative">
                    <input className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" placeholder="Ex: Aposentadoria Especial..." value={q} onChange={e => setQ(e.target.value)} onKeyPress={e => e.key === 'Enter' && fetchList()} />
                    <button className="absolute right-2 top-1.5 text-slate-400" onClick={fetchList}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                  </div>
                </div>
                <button className="w-full py-2 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors" onClick={fetchList}>Filtrar Base</button>
              </div>
            </div>

            <div className="bg-blue-600 p-6 rounded-xl shadow-lg border border-blue-500 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-bold mb-2">Importação em Massa</h3>
                <p className="text-blue-100 text-sm mb-4">Atualize sua base de precedentes rapidamente usando arquivos CSV.</p>
                <input type="file" accept=".csv" className="hidden" id="csv-import" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
                <label htmlFor="csv-import" className="block w-full text-center py-2 bg-white/20 hover:bg-white/30 rounded-lg cursor-pointer transition-colors border border-white/30 text-sm font-bold mb-2">
                  {selectedFile ? selectedFile.name : 'Selecionar Arquivo'}
                </label>
                {selectedFile && (
                  <button className="w-full py-2 bg-white text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors shadow-sm" onClick={handleImport}>Importar Agora</button>
                )}
              </div>
              <svg className="absolute -right-4 -bottom-4 w-32 h-32 text-blue-500/20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h2v2h-2v-2zm0-10h2v8h-2V6z" /></svg>
            </div>
          </div>

          {/* Records List */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500">Consultando precedentes...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-400">Nenhuma jurisprudência encontrada para "{q}"</p>
                  </div>
                ) : items.map(item => (
                  <div key={item.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col md:flex-row gap-6 group">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">{item.court || 'Sem Tribunal'}</span>
                        <span className="text-slate-400 text-xs">{item.date ? new Date(item.date).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-2">{item.title}</h2>
                      {item.citation && <p className="text-sm font-mono text-slate-500 mt-1 mb-3">{item.citation}</p>}
                      <p className="text-sm text-slate-600 line-clamp-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100 italic">{item.summary}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.tags?.map((tag, idx) => (
                          <span key={idx} className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="md:w-px bg-slate-100"></div>
                    <div className="flex flex-col justify-around gap-2 min-w-[100px]">
                      <button className="w-full py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-2" onClick={() => setEditing(item)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Editar
                      </button>
                      <button className="w-full py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2" onClick={() => handleDelete(item.id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">{editing.id ? 'Editar Precedente' : 'Nova Jurisprudência'}</h2>
                <p className="text-slate-500 text-sm">Preencha os dados da decisão judicial.</p>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600 p-2" onClick={() => setEditing(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Título da Decisão</label>
                  <input className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 bg-slate-50/30" placeholder="Ex: Aposentadoria por tempo de contribuição - Especial..." value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tribunal / Instância</label>
                  <input className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 bg-slate-50/30" placeholder="Ex: TRF1, STJ, STF..." value={editing.court || ''} onChange={e => setEditing({ ...editing, court: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Data da Decisão</label>
                  <input type="date" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 bg-slate-50/30" value={editing.date || ''} onChange={e => setEditing({ ...editing, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Número da Citação / Processo</label>
                  <input className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 bg-slate-50/30" placeholder="Ex: RE 123456 / SP..." value={editing.citation || ''} onChange={e => setEditing({ ...editing, citation: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tags (separadas por vírgula)</label>
                  <input className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 bg-slate-50/30" placeholder="Ex: Rural, Especial, CNIS..." value={editing.tags?.join(', ') || ''} onChange={e => setEditing({ ...editing, tags: e.target.value.split(',').map(s => s.trim()).filter(s => s) })} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Ementa / Resumo</label>
                <textarea className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 bg-slate-50/30 font-serif" rows={4} placeholder="Digite o resumo da decisão aqui..." value={editing.summary || ''} onChange={e => setEditing({ ...editing, summary: e.target.value })}></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Texto Íntegra</label>
                <textarea className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 bg-slate-50/30 font-mono text-sm" rows={8} placeholder="Cole o texto completo da decisão ou fundamentação..." value={editing.full_text || ''} onChange={e => setEditing({ ...editing, full_text: e.target.value })}></textarea>
              </div>
            </div>

            <footer className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button type="button" className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors" onClick={() => setEditing(null)}>Cancelar</button>
              <button type="submit" className="px-10 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md">Salvar Decisão</button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
};

export default JurisprudenceAdmin;
