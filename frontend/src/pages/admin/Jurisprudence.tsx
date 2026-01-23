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
      const res = await fetch(`${apiBase}/api/jurisprudence?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setItems(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar jurisprudência');
    } finally { setIsLoading(false); }
  };

  const handleImport = async () => {
    if (!selectedFile) { toast.warning('Selecione um CSV'); return; }
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const form = new FormData();
      form.append('file', selectedFile);
      const res = await fetch(`${apiBase}/api/jurisprudence/import`, { method: 'POST', body: form, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) {
        const text = await res.text().catch(() => 'no body');
        throw new Error(text || 'Import failed');
      }
      toast.success('Importado com sucesso');
      setSelectedFile(null);
      fetchList();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao importar: ' + (err.message || ''));
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm('Deseja remover este registro?')) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const res = await fetch(`${apiBase}/api/jurisprudence/${id}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Removido');
      fetchList();
    } catch (err) { console.error(err); toast.error('Erro ao remover'); }
  };

  const handleSave = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (!editing) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const method = editing.id ? 'PATCH' : 'POST';
      const url = editing.id ? `${apiBase}/api/jurisprudence/${editing.id}` : `${apiBase}/api/jurisprudence`;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(editing) });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Salvo');
      setEditing(null);
      fetchList();
    } catch (err) { console.error(err); toast.error('Erro ao salvar'); }
  };

  if (loading) return <div>Carregando...</div>;
  if (profile?.role !== 'admin') return <div>Access denied</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Administração de Jurisprudência</h1>

      <div className="mb-4 flex gap-2">
        <input className="p-2 border rounded" placeholder="Buscar por título" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn" onClick={fetchList}>Buscar</button>
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-bold">Importar CSV</label>
        <input type="file" accept=".csv" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
        <div className="mt-2"><button className="btn" onClick={handleImport}>Importar</button></div>
      </div>

      <div className="mb-6">
        <button className="btn" onClick={() => setEditing({ title: '', tags: [] })}>Nova Jurisprudência</button>
      </div>

      {isLoading ? <div>Carregando lista...</div> : (
        <table className="w-full table-auto border-collapse border">
          <thead>
            <tr className="bg-slate-100"><th className="p-2 border">Título</th><th className="p-2 border">Tribunal</th><th className="p-2 border">Data</th><th className="p-2 border">Ações</th></tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="p-2 border">{item.title}</td>
                <td className="p-2 border">{item.court}</td>
                <td className="p-2 border">{item.date}</td>
                <td className="p-2 border">
                  <button className="mr-2 text-sm" onClick={() => setEditing(item)}>Editar</button>
                  <button className="text-sm text-red-600" onClick={() => handleDelete(item.id)}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <form onSubmit={handleSave} className="bg-white p-6 rounded shadow-lg w-3/4 max-w-2xl">
            <h2 className="text-xl font-bold mb-4">{editing.id ? 'Editar' : 'Nova'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold">Título</label>
                <input className="w-full p-2 border rounded" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold">Tribunal</label>
                <input className="w-full p-2 border rounded" value={editing.court || ''} onChange={e => setEditing({ ...editing, court: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold">Data</label>
                <input type="date" className="w-full p-2 border rounded" value={editing.date || ''} onChange={e => setEditing({ ...editing, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold">Citação</label>
                <input className="w-full p-2 border rounded" value={editing.citation || ''} onChange={e => setEditing({ ...editing, citation: e.target.value })} />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-bold">Resumo</label>
              <textarea className="w-full p-2 border rounded" rows={4} value={editing.summary || ''} onChange={e => setEditing({ ...editing, summary: e.target.value })}></textarea>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-bold">Texto completo</label>
              <textarea className="w-full p-2 border rounded" rows={6} value={editing.full_text || ''} onChange={e => setEditing({ ...editing, full_text: e.target.value })}></textarea>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn" onClick={() => setEditing(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default JurisprudenceAdmin;
