import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { toast } from 'react-toastify';

const apiBase = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:8000';

const JurisdictionAdmin: React.FC = () => {
  const { profile, loading } = useProfile();
  const [tab, setTab] = useState<'sections'|'subsections'|'municipalities'|'maps'>('sections');

  // sections
  const [sections, setSections] = useState<any[]>([]);
  const [editingSection, setEditingSection] = useState<any|null>(null);
  const [showSubsections, setShowSubsections] = useState<Record<string, boolean>>({});

  // subsections
  const [subsections, setSubsections] = useState<any[]>([]);
  const [editingSub, setEditingSub] = useState<any|null>(null);

  // municipalities
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [editingMun, setEditingMun] = useState<any|null>(null);

  // maps
  const [maps, setMaps] = useState<any[]>([]);
  const [editingMap, setEditingMap] = useState<any|null>(null);

  useEffect(() => { if (!loading) fetchAll(); }, [loading]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleImport = async () => {
    if (!selectedFile) { toast.warning('Selecione um arquivo CSV ou XLSX'); return; }
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const form = new FormData();
      form.append('file', selectedFile);
      const res = await fetch(`${apiBase}/api/jurisdiction/import`, { method: 'POST', body: form, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) {
        const text = await res.text().catch(() => 'no body');
        throw new Error(text || 'Import failed');
      }
      const data = await res.json();
      toast.success('Importado: ' + JSON.stringify(data.inserted));
      setSelectedFile(null);
      fetchAll();
    } catch (err: any) { console.error(err); toast.error('Erro ao importar: ' + (err.message || '')); }
  };

  const fetchAll = async () => {
    await Promise.all([fetchSections(), fetchSubsections(), fetchMunicipalities(), fetchMaps()]);
  };

  const fetchSections = async () => {
    try {
      const res = await fetch(`${apiBase}/api/jurisdiction/sections`);
      const data = await res.json(); setSections(data||[]);
    } catch (e) { console.error(e); toast.error('Erro ao carregar seções'); }
  };

  const fetchSubsections = async () => {
    try { const res = await fetch(`${apiBase}/api/jurisdiction/subsections`); const data = await res.json(); setSubsections(data||[]); } catch (e) { console.error(e); toast.error('Erro ao carregar subseções'); }
  };

  const fetchMunicipalities = async () => {
    try { const res = await fetch(`${apiBase}/api/jurisdiction/municipalities`); const data = await res.json(); setMunicipalities(data||[]); } catch (e) { console.error(e); toast.error('Erro ao carregar municípios'); }
  };

  const fetchMaps = async () => {
    try { const res = await fetch(`${apiBase}/api/jurisdiction/maps`); const data = await res.json(); setMaps(data||[]); } catch (e) { console.error(e); toast.error('Erro ao carregar mapa'); }
  };

  const getToken = async () => {
    const session = await supabase.auth.getSession();
    return session?.data?.session?.access_token;
  };

  const saveSection = async (ev?: React.FormEvent) => {
    ev?.preventDefault(); if (!editingSection) return;
    try {
      const token = await getToken();
      const method = editingSection.id ? 'PATCH' : 'POST';
      const url = editingSection.id ? `${apiBase}/api/jurisdiction/sections/${editingSection.id}` : `${apiBase}/api/jurisdiction/sections`;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify(editingSection) });
      if (!res.ok) throw new Error('Erro');
      toast.success('Salvo'); setEditingSection(null); fetchSections();
    } catch (e:any) { console.error(e); toast.error('Erro ao salvar seção: ' + (e.message||'')); }
  };

  const saveSubsection = async (ev?: React.FormEvent) => {
    ev?.preventDefault(); if (!editingSub) return;
    try { const token = await getToken(); const method = editingSub.id ? 'PATCH' : 'POST'; const url = editingSub.id ? `${apiBase}/api/jurisdiction/subsections/${editingSub.id}` : `${apiBase}/api/jurisdiction/subsections`; const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify(editingSub) }); if (!res.ok) throw new Error('Erro'); toast.success('Salvo'); setEditingSub(null); fetchSubsections(); } catch (e:any) { console.error(e); toast.error('Erro ao salvar subseção: ' + (e.message||'')); }
  };

  const saveMunicipality = async (ev?: React.FormEvent) => {
    ev?.preventDefault(); if (!editingMun) return;
    try { const token = await getToken(); const method = editingMun.id ? 'PATCH' : 'POST'; const url = editingMun.id ? `${apiBase}/api/jurisdiction/municipalities/${editingMun.id}` : `${apiBase}/api/jurisdiction/municipalities`; const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify(editingMun) }); if (!res.ok) throw new Error('Erro'); toast.success('Salvo'); setEditingMun(null); fetchMunicipalities(); } catch (e:any) { console.error(e); toast.error('Erro ao salvar município: ' + (e.message||'')); }
  };

  const saveMap = async (ev?: React.FormEvent) => {
    ev?.preventDefault(); if (!editingMap) return;
    try { const token = await getToken(); const method = editingMap.id ? 'PATCH' : 'POST'; const url = editingMap.id ? `${apiBase}/api/jurisdiction/maps/${editingMap.id}` : `${apiBase}/api/jurisdiction/maps`; const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify(editingMap) }); if (!res.ok) throw new Error('Erro'); toast.success('Salvo'); setEditingMap(null); fetchMaps(); } catch (e:any) { console.error(e); toast.error('Erro ao salvar mapa: ' + (e.message||'')); }
  };

  const remove = async (url: string, refresh: () => void) => {
    if (!confirm('Deseja remover?')) return; try { const token = await getToken(); const res = await fetch(url, { method: 'DELETE', headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } }); if (!res.ok) throw new Error('Erro'); toast.success('Removido'); refresh(); } catch (e) { console.error(e); toast.error('Erro ao remover'); }
  };

  if (loading) return <div>Carregando...</div>;
  if (profile?.role !== 'admin') return <div>Access denied</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Administração de Jurisdição</h1>
      <div className="mb-4 flex gap-2">
        <button className={`btn ${tab==='sections'?'btn-primary':''}`} onClick={() => setTab('sections')}>Seções</button>
        <button className={`btn ${tab==='subsections'?'btn-primary':''}`} onClick={() => setTab('subsections')}>Subseções</button>
        <button className={`btn ${tab==='municipalities'?'btn-primary':''}`} onClick={() => setTab('municipalities')}>Municípios</button>
        <button className={`btn ${tab==='maps'?'btn-primary':''}`} onClick={() => setTab('maps')}>Relação de Jurisdição</button>
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-bold">Importar CSV / XLSX</label>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
        <div className="mt-2 flex gap-2"><button className="btn" onClick={handleImport}>Importar</button></div>
      </div>

      {tab === 'sections' && (
        <div>
          <div className="mb-4"><button className="btn" onClick={() => setEditingSection({ name: '', code: '', trf: '' })}>Nova Seção Judiciária</button></div>
          <table className="w-full table-auto border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 border">Seção Judiciária</th>
                <th className="p-2 border">Código</th>
                <th className="p-2 border">TRF</th>
                <th className="p-2 border">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(s => (
                <React.Fragment key={s.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="p-2 border">{s.name}</td>
                    <td className="p-2 border">{s.code}</td>
                    <td className="p-2 border">{s.trf}</td>
                    <td className="p-2 border">
                      <button className="mr-2 text-sm" onClick={() => setEditingSection(s)}>Editar</button>
                      <button className="mr-2 text-sm" onClick={() => setShowSubsections(prev => ({ ...prev, [s.id]: !prev[s.id] }))}>{showSubsections[s.id] ? 'Ocultar Subseções' : 'Ver Subseções'}</button>
                      <button className="text-sm text-red-600" onClick={() => remove(`${apiBase}/api/jurisdiction/sections/${s.id}`, fetchSections)}>Remover</button>
                    </td>
                  </tr>
                  {showSubsections[s.id] && (
                    <tr>
                      <td className="p-2 border bg-slate-50" colSpan={4}>
                        <div className="mb-2 font-semibold">Subseções</div>
                        <table className="w-full table-auto border-collapse border">
                          <thead><tr className="bg-white"><th className="p-1 border">Nome</th><th className="p-1 border">Cidade</th><th className="p-1 border">JEF?</th><th className="p-1 border">Ações</th></tr></thead>
                          <tbody>
                            {subsections.filter(ss => (ss.section && ss.section.name ? ss.section.id === s.id : ss.section_id === s.id)).map(ss => (
                              <tr key={ss.id} className="hover:bg-slate-50"><td className="p-1 border">{ss.name}</td><td className="p-1 border">{ss.city}</td><td className="p-1 border">{ss.has_jef?'Sim':'Não'}</td><td className="p-1 border"><button className="mr-2 text-sm" onClick={()=>setEditingSub(ss)}>Editar</button><button className="text-sm text-red-600" onClick={()=>remove(`${apiBase}/api/jurisdiction/subsections/${ss.id}`, fetchSubsections)}>Remover</button></td></tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'subsections' && (
        <div>
          <div className="mb-4"><button className="btn" onClick={() => setEditingSub({ section_id: sections[0]?.id||'', name: '', city: '', has_jef: true })}>Nova Subseção</button></div>
          <table className="w-full table-auto border-collapse border"><thead><tr className="bg-slate-100"><th className="p-2 border">Nome</th><th className="p-2 border">Cidade</th><th className="p-2 border">Seção</th><th className="p-2 border">JEF?</th><th className="p-2 border">Ações</th></tr></thead><tbody>{subsections.map(s=> (<tr key={s.id} className="hover:bg-slate-50"><td className="p-2 border">{s.name}</td><td className="p-2 border">{s.city}</td><td className="p-2 border">{(s.section && s.section.name) ? s.section.name : (sections.find(sec=>sec.id===s.section_id)?.name||s.section_id)}</td><td className="p-2 border">{s.has_jef?'Sim':'Não'}</td><td className="p-2 border"><button className="mr-2 text-sm" onClick={()=>setEditingSub(s)}>Editar</button><button className="text-sm text-red-600" onClick={()=>remove(`${apiBase}/api/jurisdiction/subsections/${s.id}`, fetchSubsections)}>Remover</button></td></tr>))}</tbody></table>
        </div>
      )}

      {tab === 'municipalities' && (
        <div>
          <div className="mb-4"><button className="btn" onClick={() => setEditingMun({ name: '', state: '', ibge_code: '' })}>Novo Município</button></div>
          <table className="w-full table-auto border-collapse border"><thead><tr className="bg-slate-100"><th className="p-2 border">Nome</th><th className="p-2 border">UF</th><th className="p-2 border">IBGE</th><th className="p-2 border">Ações</th></tr></thead><tbody>{municipalities.map(m=> (<tr key={m.id} className="hover:bg-slate-50"><td className="p-2 border">{m.name}</td><td className="p-2 border">{m.state}</td><td className="p-2 border">{m.ibge_code}</td><td className="p-2 border"><button className="mr-2 text-sm" onClick={()=>setEditingMun(m)}>Editar</button><button className="text-sm text-red-600" onClick={()=>remove(`${apiBase}/api/jurisdiction/municipalities/${m.id}`, fetchMunicipalities)}>Remover</button></td></tr>))}</tbody></table>
        </div>
      )}

      {tab === 'maps' && (
        <div>
          <div className="mb-4"><button className="btn" onClick={() => setEditingMap({ municipality_id: municipalities[0]?.id||'', subsection_id: subsections[0]?.id||'', legal_basis: '' })}>Novo Mapeamento (Município → Subseção)</button></div>
          <table className="w-full table-auto border-collapse border"><thead><tr className="bg-slate-100"><th className="p-2 border">Município</th><th className="p-2 border">UF</th><th className="p-2 border">Subseção</th><th className="p-2 border">Cidade</th><th className="p-2 border">Base legal</th><th className="p-2 border">Ações</th></tr></thead><tbody>{maps.map(m=> (<tr key={m.id} className="hover:bg-slate-50"><td className="p-2 border">{m.municipality?.name}</td><td className="p-2 border">{m.municipality?.state}</td><td className="p-2 border">{m.subsection?.name}</td><td className="p-2 border">{m.subsection?.city}</td><td className="p-2 border">{m.legal_basis}</td><td className="p-2 border"><button className="mr-2 text-sm" onClick={()=>setEditingMap({ ...m, municipality_id: m.municipality?.id, subsection_id: m.subsection?.id })}>Editar</button><button className="text-sm text-red-600" onClick={()=>remove(`${apiBase}/api/jurisdiction/maps/${m.id}`, fetchMaps)}>Remover</button></td></tr>))}</tbody></table>
        </div>
      )}

      {/* Modals */}
      {editingSection && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center"><form onSubmit={saveSection} className="bg-white p-6 rounded shadow w-96"><h2 className="font-bold mb-2">Seção</h2><label className="block">Nome<input className="w-full p-2 border" value={editingSection.name} onChange={e=>setEditingSection({...editingSection, name: e.target.value})} /></label><label className="block">Código<input className="w-full p-2 border" value={editingSection.code} onChange={e=>setEditingSection({...editingSection, code: e.target.value})} /></label><label className="block">TRF<input className="w-full p-2 border" value={editingSection.trf} onChange={e=>setEditingSection({...editingSection, trf: e.target.value})} /></label><div className="mt-4 flex justify-end gap-2"><button type="button" className="btn" onClick={()=>setEditingSection(null)}>Cancelar</button><button type="submit" className="btn btn-primary">Salvar</button></div></form></div>
      )}

      {editingSub && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center"><form onSubmit={saveSubsection} className="bg-white p-6 rounded shadow w-96"><h2 className="font-bold mb-2">Subseção</h2><label className="block">Seção<select className="w-full p-2 border" value={editingSub.section_id} onChange={e=>setEditingSub({...editingSub, section_id: e.target.value})}>{sections.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="block">Nome<input className="w-full p-2 border" value={editingSub.name} onChange={e=>setEditingSub({...editingSub, name: e.target.value})} /></label><label className="block">Cidade<input className="w-full p-2 border" value={editingSub.city} onChange={e=>setEditingSub({...editingSub, city: e.target.value})} /></label><label className="block">Possui JEF<select className="w-full p-2 border" value={editingSub.has_jef? '1':'0'} onChange={e=>setEditingSub({...editingSub, has_jef: e.target.value==='1'})}><option value="1">Sim</option><option value="0">Não</option></select></label><div className="mt-4 flex justify-end gap-2"><button type="button" className="btn" onClick={()=>setEditingSub(null)}>Cancelar</button><button type="submit" className="btn btn-primary">Salvar</button></div></form></div>
      )}

      {editingMun && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center"><form onSubmit={saveMunicipality} className="bg-white p-6 rounded shadow w-96"><h2 className="font-bold mb-2">Município</h2><label className="block">Nome<input className="w-full p-2 border" value={editingMun.name} onChange={e=>setEditingMun({...editingMun, name: e.target.value})} /></label><label className="block">UF<input className="w-full p-2 border" value={editingMun.state} onChange={e=>setEditingMun({...editingMun, state: e.target.value})} /></label><label className="block">IBGE<input className="w-full p-2 border" value={editingMun.ibge_code||''} onChange={e=>setEditingMun({...editingMun, ibge_code: e.target.value})} /></label><div className="mt-4 flex justify-end gap-2"><button type="button" className="btn" onClick={()=>setEditingMun(null)}>Cancelar</button><button type="submit" className="btn btn-primary">Salvar</button></div></form></div>
      )}

      {editingMap && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center"><form onSubmit={saveMap} className="bg-white p-6 rounded shadow w-96"><h2 className="font-bold mb-2">Mapeamento</h2><label className="block">Município<select className="w-full p-2 border" value={editingMap.municipality_id} onChange={e=>setEditingMap({...editingMap, municipality_id: e.target.value})}>{municipalities.map(m=> <option key={m.id} value={m.id}>{m.name} - {m.state}</option>)}</select></label><label className="block">Subseção<select className="w-full p-2 border" value={editingMap.subsection_id} onChange={e=>setEditingMap({...editingMap, subsection_id: e.target.value})}>{subsections.map(s=> <option key={s.id} value={s.id}>{s.name} - {s.city}</option>)}</select></label><label className="block">Base legal<textarea className="w-full p-2 border" value={editingMap.legal_basis} onChange={e=>setEditingMap({...editingMap, legal_basis: e.target.value})}></textarea></label><div className="mt-4 flex justify-end gap-2"><button type="button" className="btn" onClick={()=>setEditingMap(null)}>Cancelar</button><button type="submit" className="btn btn-primary">Salvar</button></div></form></div>
      )}

    </div>
  );
};

export default JurisdictionAdmin;
