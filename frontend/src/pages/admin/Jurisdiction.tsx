import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { toast } from 'react-toastify';

const apiBase = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:8000';

const JurisdictionAdmin: React.FC = () => {
  const { profile, loading } = useProfile();
  const [tab, setTab] = useState<'sections' | 'subsections' | 'municipalities' | 'maps'>('sections');

  // sections
  const [sections, setSections] = useState<any[]>([]);
  const [editingSection, setEditingSection] = useState<any | null>(null);
  const [showSubsections, setShowSubsections] = useState<Record<string, boolean>>({});

  // subsections
  const [subsections, setSubsections] = useState<any[]>([]);
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [showSubMunicipalities, setShowSubMunicipalities] = useState<Record<string, boolean>>({});

  // municipalities
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [editingMun, setEditingMun] = useState<any | null>(null);

  // maps
  const [maps, setMaps] = useState<any[]>([]);
  const [editingMap, setEditingMap] = useState<any | null>(null);

  useEffect(() => { if (!loading) fetchAll(); }, [loading]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

      let inserted = { sections: 0, subsections: 0, municipalities: 0, maps: 0, updated_maps: 0 };
      toast.info('Iniciando importação...', { autoClose: false, toastId: 'importing' });

      for (const row of rows) {
        const section_name = row.section || row.Seção;
        const subsection_name = row.subsection || row.Subseção;
        const municipality_name = row.municipality || row.Município;
        const state = row.state || row.UF;
        const legal_basis = row.legal_basis || row.legal || row.base_legal || row['Base legal'];

        if (!section_name || !subsection_name || !municipality_name || !state) continue;

        // 1. Get or Create Section
        const { data: secData, error: secErr } = await supabase
          .from('judicial_sections')
          .select('id')
          .ilike('name', section_name.trim())
          .maybeSingle();

        let section_id = secData?.id;
        if (!section_id) {
          const { data: insSec, error: insErr } = await supabase
            .from('judicial_sections')
            .insert([{ name: section_name.trim(), code: section_name.trim().substring(0, 6).toUpperCase(), trf: 'TRF' }])
            .select('id')
            .single();
          if (insErr) { console.error('Error inserting section:', insErr); continue; }
          section_id = insSec.id;
          inserted.sections++;
        }

        // 2. Get or Create Subsection
        const { data: subData, error: subErr } = await supabase
          .from('judicial_subsections')
          .select('id')
          .eq('section_id', section_id)
          .ilike('name', subsection_name.trim())
          .maybeSingle();

        let subsection_id = subData?.id;
        if (!subsection_id) {
          const { data: insSub, error: insSubErr } = await supabase
            .from('judicial_subsections')
            .insert([{ section_id, name: subsection_name.trim(), city: subsection_name.trim(), has_jef: true }])
            .select('id')
            .single();
          if (insSubErr) { console.error('Error inserting subsection:', insSubErr); continue; }
          subsection_id = insSub.id;
          inserted.subsections++;
        }

        // 3. Get or Create Municipality
        const { data: munData, error: munErr } = await supabase
          .from('municipalities')
          .select('id')
          .eq('state', state.trim())
          .ilike('name', municipality_name.trim())
          .maybeSingle();

        let municipality_id = munData?.id;
        if (!municipality_id) {
          const { data: insMun, error: insMunErr } = await supabase
            .from('municipalities')
            .insert([{ name: municipality_name.trim(), state: state.trim() }])
            .select('id')
            .single();
          if (insMunErr) { console.error('Error inserting municipality:', insMunErr); continue; }
          municipality_id = insMun.id;
          inserted.municipalities++;
        }

        // 4. Upsert Map
        const { data: mapData, error: mapErr } = await supabase
          .from('jurisdiction_map')
          .select('id')
          .eq('municipality_id', municipality_id)
          .maybeSingle();

        if (mapData) {
          const { error: updErr } = await supabase
            .from('jurisdiction_map')
            .update({ subsection_id, legal_basis: legal_basis?.trim() })
            .eq('id', mapData.id);
          if (!updErr) inserted.updated_maps++;
        } else {
          const { error: insErr } = await supabase
            .from('jurisdiction_map')
            .insert([{ municipality_id, subsection_id, legal_basis: legal_basis?.trim() }]);
          if (!insErr) inserted.maps++;
        }
      }

      toast.dismiss('importing');
      toast.success(`Importação finalizada!`);
      console.log('Resultados:', inserted);
      setSelectedFile(null);
      fetchAll();
    } catch (err: any) {
      toast.dismiss('importing');
      console.error(err);
      toast.error('Erro ao importar: ' + (err.message || ''));
    }
  };

  const fetchAll = async () => {
    await Promise.all([fetchSections(), fetchSubsections(), fetchMunicipalities(), fetchMaps()]);
  };

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('judicial_sections')
        .select('*')
        .order('name');
      if (error) throw error;
      setSections(data || []);
    } catch (e) { console.error(e); toast.error('Erro ao carregar seções'); }
  };

  const fetchSubsections = async () => {
    try {
      const { data, error } = await supabase
        .from('judicial_subsections')
        .select(`
          *, 
          section:judicial_sections(id, name, code, trf)
        `)
        .order('name');
      if (error) throw error;

      const mapped = data?.map(item => ({
        ...item,
        section: Array.isArray(item.section) ? item.section[0] : item.section
      })) || [];
      setSubsections(mapped);
    } catch (e) { console.error(e); toast.error('Erro ao carregar subseções'); }
  };

  const fetchMunicipalities = async () => {
    try {
      const { data, error } = await supabase
        .from('municipalities')
        .select('*')
        .order('name');
      if (error) throw error;
      setMunicipalities(data || []);
    } catch (e) { console.error(e); toast.error('Erro ao carregar municípios'); }
  };

  const fetchMaps = async () => {
    try {
      const { data, error } = await supabase
        .from('jurisdiction_map')
        .select(`
          *, 
          municipality:municipalities(id, name, state), 
          subsection:judicial_subsections(id, name, city)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const mapped = data?.map(item => ({
        ...item,
        municipality: Array.isArray(item.municipality) ? item.municipality[0] : item.municipality,
        subsection: Array.isArray(item.subsection) ? item.subsection[0] : item.subsection
      })) || [];
      setMaps(mapped);
    } catch (e) { console.error(e); toast.error('Erro ao carregar mapa'); }
  };

  const saveSection = async (ev?: React.FormEvent) => {
    ev?.preventDefault(); if (!editingSection) return;
    try {
      const { id, ...payload } = editingSection;
      let error;
      if (id) {
        ({ error } = await supabase.from('judicial_sections').update(payload).eq('id', id));
      } else {
        ({ error } = await supabase.from('judicial_sections').insert([payload]));
      }
      if (error) throw error;
      toast.success('Salvo'); setEditingSection(null); fetchSections();
    } catch (e: any) { console.error(e); toast.error('Erro ao salvar seção: ' + (e.message || '')); }
  };

  const saveSubsection = async (ev?: React.FormEvent) => {
    ev?.preventDefault(); if (!editingSub) return;
    try {
      const { id, section, ...payload } = editingSub;
      let error;
      if (id) {
        ({ error } = await supabase.from('judicial_subsections').update(payload).eq('id', id));
      } else {
        ({ error } = await supabase.from('judicial_subsections').insert([payload]));
      }
      if (error) throw error;
      toast.success('Salvo'); setEditingSub(null); fetchSubsections();
    } catch (e: any) { console.error(e); toast.error('Erro ao salvar subseção: ' + (e.message || '')); }
  };

  const saveMunicipality = async (ev?: React.FormEvent) => {
    ev?.preventDefault(); if (!editingMun) return;
    try {
      const { id, ...payload } = editingMun;
      let error;
      if (id) {
        ({ error } = await supabase.from('municipalities').update(payload).eq('id', id));
      } else {
        ({ error } = await supabase.from('municipalities').insert([payload]));
      }
      if (error) throw error;
      toast.success('Salvo'); setEditingMun(null); fetchMunicipalities();
    } catch (e: any) { console.error(e); toast.error('Erro ao salvar município: ' + (e.message || '')); }
  };

  const saveMap = async (ev?: React.FormEvent) => {
    ev?.preventDefault(); if (!editingMap) return;
    try {
      const { id, municipality, subsection, ...payload } = editingMap;
      let error;
      if (id) {
        ({ error } = await supabase.from('jurisdiction_map').update(payload).eq('id', id));
      } else {
        ({ error } = await supabase.from('jurisdiction_map').insert([payload]));
      }
      if (error) throw error;
      toast.success('Salvo'); setEditingMap(null); fetchMaps();
    } catch (e: any) { console.error(e); toast.error('Erro ao salvar mapa: ' + (e.message || '')); }
  };

  const remove = async (table: string, id: string, refresh: () => void) => {
    if (!confirm('Deseja remover?')) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      toast.success('Removido'); refresh();
    } catch (e) { console.error(e); toast.error('Erro ao remover'); }
  };

  if (loading) return <div>Carregando...</div>;
  if (profile?.role !== 'admin') return <div>Access denied</div>;

  return (
    <div className="p-8 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Administração de Jurisdição</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie seções judiciárias, subseções e a abrangência municipal.</p>
        </header>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-8">
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <button className={`px-6 py-4 font-semibold text-sm transition-colors border-b-2 ${tab === 'sections' ? 'border-primary text-primary bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} onClick={() => setTab('sections')}>Seções Judiciárias</button>
            <button className={`px-6 py-4 font-semibold text-sm transition-colors border-b-2 ${tab === 'subsections' ? 'border-primary text-primary bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} onClick={() => setTab('subsections')}>Subseções</button>
            <button className={`px-6 py-4 font-semibold text-sm transition-colors border-b-2 ${tab === 'municipalities' ? 'border-primary text-primary bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} onClick={() => setTab('municipalities')}>Municípios</button>
            <button className={`px-6 py-4 font-semibold text-sm transition-colors border-b-2 ${tab === 'maps' ? 'border-primary text-primary bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} onClick={() => setTab('maps')}>Mapa de Jurisdição</button>
          </div>

          <div className="p-6">
            <div className="mb-8 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg flex items-center justify-between">
              <div>
                <h3 className="text-blue-900 dark:text-blue-200 font-bold mb-1">Importação de Dados</h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm">Carregue dados oficiais via arquivo CSV para atualização em massa.</p>
              </div>
              <div className="flex items-center gap-4">
                <input type="file" accept=".csv" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-200 cursor-pointer" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm" onClick={handleImport}>Processar Arquivo</button>
              </div>
            </div>

            {tab === 'sections' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Seções Judiciárias</h2>
                  <button className="btn btn-primary" onClick={() => setEditingSection({ name: '', code: '', trf: '' })}>Nova Seção</button>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <th className="p-4 font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">Seção</th>
                        <th className="p-4 font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">Código</th>
                        <th className="p-4 font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">TRF</th>
                        <th className="p-4 font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {sections.map(s => (
                        <React.Fragment key={s.id}>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-4 font-medium text-slate-900 dark:text-slate-100">{s.name}</td>
                            <td className="p-4 font-mono text-xs text-slate-600 dark:text-slate-400">{s.code}</td>
                            <td className="p-4 font-semibold text-primary">{s.trf}</td>
                            <td className="p-4">
                              <div className="flex gap-4">
                                <button className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors" onClick={() => setEditingSection(s)}>Editar</button>
                                <button className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors" onClick={() => setShowSubsections(prev => ({ ...prev, [s.id]: !prev[s.id] }))}>{showSubsections[s.id] ? 'Recolher' : 'Ver Subseções'}</button>
                                <button className="text-sm text-red-600 hover:text-red-800 transition-colors" onClick={() => remove('judicial_sections', s.id, fetchSections)}>Remover</button>
                              </div>
                            </td>
                          </tr>
                          {showSubsections[s.id] && (
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                              <td className="p-4" colSpan={4}>
                                <div className="ml-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                                  <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-primary rounded-full"></span>
                                    Subseções de {s.name}
                                  </h4>
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                        <th className="pb-2 text-left">Nome</th>
                                        <th className="pb-2 text-left">Cidade</th>
                                        <th className="pb-2 text-center">JEF</th>
                                        <th className="pb-2 text-right">Ações</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                      {subsections.filter(ss => ss.section_id === s.id).map(ss => (
                                        <tr key={ss.id} className="group">
                                          <td className="py-2 font-medium text-slate-700 dark:text-slate-300">{ss.name}</td>
                                          <td className="py-2 text-slate-600 dark:text-slate-400">{ss.city}</td>
                                          <td className="py-2 text-center">
                                            {ss.has_jef ? <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] px-2 py-0.5 rounded-full font-bold">SIM</span> : <span className="text-slate-300 dark:text-slate-600">Não</span>}
                                          </td>
                                          <td className="py-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="text-xs text-slate-600 dark:text-slate-400 mr-2 hover:text-primary" onClick={() => setEditingSub(ss)}>Editar</button>
                                            <button className="text-xs text-red-600" onClick={() => remove('judicial_subsections', ss.id, fetchSubsections)}>Remover</button>
                                          </td>
                                        </tr>
                                      ))}
                                      {subsections.filter(ss => ss.section_id === s.id).length === 0 && (
                                        <tr><td colSpan={4} className="py-4 text-center text-slate-400 dark:text-slate-500 italic">Nenhuma subseção cadastrada.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'subsections' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Subseções e Abrangência</h2>
                  <button className="btn btn-primary" onClick={() => setEditingSub({ section_id: sections[0]?.id || '', name: '', city: '', has_jef: true })}>Nova Subseção</button>
                </div>
                <div className="space-y-4">
                  {subsections.map(s => (
                    <div key={s.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition-all">
                      <div className="p-4 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">{s.name.substring(0, 1)}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 dark:text-slate-100">{s.name}</h3>
                              {s.has_jef && <span className="text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded tracking-tighter">JUIZADO ESPECIAL FEDERAL</span>}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Sede: {s.city} • {s.section?.name || 'Seção não vinculada'}</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <button className="text-sm font-semibold text-primary hover:underline" onClick={() => setShowSubMunicipalities(prev => ({ ...prev, [s.id]: !prev[s.id] }))}>
                            {showSubMunicipalities[s.id] ? 'Ocultar Abrangência' : 'Ver Municípios Atendidos'}
                          </button>
                          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
                          <button className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-colors" onClick={() => setEditingSub(s)}>Editar</button>
                          <button className="text-sm text-red-400 hover:text-red-600 transition-colors" onClick={() => remove('judicial_subsections', s.id, fetchSubsections)}>Remover</button>
                        </div>
                      </div>
                      {showSubMunicipalities[s.id] && (
                        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20">
                          <div className="flex items-center gap-2 mb-4">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Municípios em Jurisdição</h4>
                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{maps.filter(m => m.subsection_id === s.id).length} cidades</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {maps.filter(m => m.subsection_id === s.id).map(m => (
                              <div key={m.id} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col group/item hover:border-primary/30 transition-colors">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{m.municipality?.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2">{m.municipality?.state}</span>
                                {m.legal_basis && (
                                  <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 line-clamp-2 italic" title={m.legal_basis}>{m.legal_basis}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                            {maps.filter(m => m.subsection_id === s.id).length === 0 && (
                              <div className="col-span-full py-8 text-center bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                                <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhum município mapeado para esta subseção.</p>
                                <button className="mt-2 text-xs text-primary font-bold hover:underline" onClick={() => setTab('maps')}>Vincular municípios agora</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'municipalities' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cadastro de Municípios</h2>
                  <button className="btn btn-primary" onClick={() => setEditingMun({ name: '', state: '', ibge_code: '' })}>Novo Município</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {municipalities.map(m => (
                    <div key={m.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between group shadow-sm">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">{m.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{m.state} {m.ibge_code ? `• Código IBGE: ${m.ibge_code}` : ''}</p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500" onClick={() => setEditingMun(m)}>Editar</button>
                        <button className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded" onClick={() => remove('municipalities', m.id, fetchMunicipalities)}>Remover</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'maps' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Relação de Jurisdição</h2>
                  <button className="btn btn-primary" onClick={() => setEditingMap({ municipality_id: municipalities[0]?.id || '', subsection_id: subsections[0]?.id || '', legal_basis: '' })}>Novo Vínculo</button>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold">
                        <th className="p-4">Município</th>
                        <th className="p-4 text-center">UF</th>
                        <th className="p-4">Subseção Competente</th>
                        <th className="p-4">Base Legal</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {maps.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{m.municipality?.name}</td>
                          <td className="p-4 text-center font-bold text-slate-400 dark:text-slate-500">{m.municipality?.state}</td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700 dark:text-slate-300">{m.subsection?.name}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">Cidade: {m.subsection?.city}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic max-w-xs" title={m.legal_basis}>{m.legal_basis || '—'}</span>
                          </td>
                          <td className="p-4 text-right">
                            <button className="text-xs font-bold text-primary mr-3 hover:underline" onClick={() => setEditingMap({ ...m, municipality_id: m.municipality_id, subsection_id: m.subsection_id })}>Editar</button>
                            <button className="text-xs font-bold text-red-500 hover:text-red-700 shadow-none" onClick={() => remove('jurisdiction_map', m.id, fetchMaps)}>Desvincular</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {editingSection && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <form onSubmit={saveSection} className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Configurar Seção</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Nome da Seção</span>
                <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={editingSection.name} onChange={e => setEditingSection({ ...editingSection, name: e.target.value })} placeholder="Ex: Seção Judiciária da Bahia" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Código</span>
                <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={editingSection.code} onChange={e => setEditingSection({ ...editingSection, code: e.target.value })} placeholder="Ex: SJBA" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">TRF Vinculado</span>
                <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={editingSection.trf} onChange={e => setEditingSection({ ...editingSection, trf: e.target.value })} placeholder="Ex: TRF1" />
              </label>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors" onClick={() => setEditingSection(null)}>Cancelar</button>
              <button type="submit" className="px-8 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md">Salvar Seção</button>
            </div>
          </form>
        </div>
      )}

      {editingSub && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <form onSubmit={saveSubsection} className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Configurar Subseção</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Seção Judiciária</span>
                <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none" value={editingSub.section_id} onChange={e => setEditingSub({ ...editingSub, section_id: e.target.value })}>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Nome da Subseção</span>
                <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={editingSub.name} onChange={e => setEditingSub({ ...editingSub, name: e.target.value })} placeholder="Ex: Subseção de Salvador" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Cidade Sede</span>
                <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={editingSub.city} onChange={e => setEditingSub({ ...editingSub, city: e.target.value })} placeholder="Ex: Salvador" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Possui JEF?</span>
                <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none" value={editingSub.has_jef ? '1' : '0'} onChange={e => setEditingSub({ ...editingSub, has_jef: e.target.value === '1' })}>
                  <option value="1">Sim (Juizado Especial Federal)</option>
                  <option value="0">Não</option>
                </select>
              </label>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors" onClick={() => setEditingSub(null)}>Cancelar</button>
              <button type="submit" className="px-8 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md">Salvar Subseção</button>
            </div>
          </form>
        </div>
      )}

      {editingMun && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <form onSubmit={saveMunicipality} className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Cadastro de Município</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Nome do Município</span>
                <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={editingMun.name} onChange={e => setEditingMun({ ...editingMun, name: e.target.value })} placeholder="Ex: Salvador" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Estado (UF)</span>
                <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={editingMun.state} onChange={e => setEditingMun({ ...editingMun, state: e.target.value.toUpperCase() })} maxLength={2} placeholder="Ex: BA" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Código IBGE (Opcional)</span>
                <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={editingMun.ibge_code || ''} onChange={e => setEditingMun({ ...editingMun, ibge_code: e.target.value })} placeholder="Ex: 2927408" />
              </label>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors" onClick={() => setEditingMun(null)}>Cancelar</button>
              <button type="submit" className="px-8 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md">Salvar Município</button>
            </div>
          </form>
        </div>
      )}

      {editingMap && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <form onSubmit={saveMap} className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Mapeamento de Abrangência</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Município para Vincular</span>
                <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none" value={editingMap.municipality_id} onChange={e => setEditingMap({ ...editingMap, municipality_id: e.target.value })}>
                  {municipalities.map(m => <option key={m.id} value={m.id}>{m.name} - {m.state}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Subseção Competente</span>
                <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none" value={editingMap.subsection_id} onChange={e => setEditingMap({ ...editingMap, subsection_id: e.target.value })}>
                  {subsections.map(s => <option key={s.id} value={s.id}>{s.name} - {s.city}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Base Legal / Resolução</span>
                <textarea className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none font-serif h-32" value={editingMap.legal_basis} onChange={e => setEditingMap({ ...editingMap, legal_basis: e.target.value })} placeholder="Descreva o ato normativo que estabelece a jurisdição..."></textarea>
              </label>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors" onClick={() => setEditingMap(null)}>Cancelar</button>
              <button type="submit" className="px-8 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md">Confirmar Mapeamento</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default JurisdictionAdmin;
