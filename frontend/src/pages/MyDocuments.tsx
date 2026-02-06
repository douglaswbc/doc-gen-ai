import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { toast } from 'react-toastify';
import { downloadAsPDF, downloadAsWord, sanitizeFilename } from '../utils/documentExport';

// Interface local
interface Document {
  id: string;
  title: string;
  specialty: string;
  type: string;
  content: string;
  createdAt: string;
  status: string;
  created_at_raw?: string;
  generatorName?: string;
  generatorOab?: string;
}

const MyDocuments: React.FC = () => {
  const { user } = useAuth();
  const { permissions, profile } = useProfile();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filtros avançados
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // State para o Modal
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedDocs: Document[] = data.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          specialty: doc.specialty,
          type: doc.type,
          content: doc.content,
          createdAt: new Date(doc.created_at).toLocaleDateString('pt-BR'),
          created_at_raw: doc.created_at,
          status: doc.status || 'Rascunho',
          generatorName: doc.generated_by_name || 'Usuário',
          generatorOab: doc.generated_by_oab || null
        }));
        setDocuments(formattedDocs);
      }
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      toast.error('Erro ao carregar seus documentos.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!permissions.canDeleteDocuments) return;

    if (!window.confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Exclusão não permitida. Verifique permissões.');
      }

      setDocuments(documents.filter(doc => doc.id !== id));
      toast.success('Documento excluído com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir o documento.');
    }
  };

  const handleView = (doc: Document) => {
    setSelectedDoc(doc);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  // Extrai o ID do documento do conteúdo HTML
  const extractDocumentId = (content: string): string | null => {
    const match = content.match(/ID:<\/span>\s*(DOC-[A-Z0-9-]+)/i);
    return match ? match[1] : null;
  };

  // Salvar alterações no documento
  const handleSave = async () => {
    if (!selectedDoc || !editorRef.current) return;

    setIsSaving(true);
    try {
      const newContent = editorRef.current.innerHTML;

      const { error } = await supabase
        .from('documents')
        .update({
          content: newContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDoc.id);

      if (error) throw error;

      // Atualiza estado local
      setDocuments(docs => docs.map(d =>
        d.id === selectedDoc.id ? { ...d, content: newContent } : d
      ));
      setSelectedDoc({ ...selectedDoc, content: newContent });
      setIsEditing(false);
      toast.success('Documento salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar o documento.');
    } finally {
      setIsSaving(false);
    }
  };

  // === FUNÇÃO DE CÓPIA INTELIGENTE ===
  const handleCopy = () => {
    if (!selectedDoc?.content) return;

    const content = isEditing && editorRef.current
      ? editorRef.current.innerHTML
      : selectedDoc.content;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.innerText;

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #000; }
          p { text-align: justify; line-height: 1.5; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid black; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; vertical-align: top; }
          th { background-color: #f2f2f2; font-weight: bold; }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;

    const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
    const textBlob = new Blob([plainText], { type: 'text/plain' });

    const data = [new ClipboardItem({
      'text/html': htmlBlob,
      'text/plain': textBlob
    })];

    navigator.clipboard.write(data)
      .then(() => toast.success('Copiado! Pronto para colar no Word.'))
      .catch(() => {
        navigator.clipboard.writeText(plainText);
        toast.success('Copiado texto puro (sem formatação).');
      });
  };

  // Filtro + Paginação
  const filteredDocs = documents.filter(doc => {
    // Filtro por texto (nome, especialidade, ID)
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.id && doc.id.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtro por status
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

    // Filtro por data
    let matchesDate = true;
    if (doc.created_at_raw) {
      const docDate = new Date(doc.created_at_raw);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (docDate < fromDate) matchesDate = false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (docDate > toDate) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocs = filteredDocs.slice(startIndex, startIndex + itemsPerPage);

  // Reset para página 1 quando buscar
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col items-center w-full flex-1 relative">
      <div className="w-full max-w-[1280px] px-4 md:px-10 py-5">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 py-6">
          <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em] text-gray-900 dark:text-white min-w-72">Meus Documentos</h1>

          {permissions.canCreateDocuments && (
            <Link to="/judicial" className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined mr-2">add</span>
              <span className="truncate">Novo Documento</span>
            </Link>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="flex-grow">
            <div className="flex w-full items-center rounded-lg h-12 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 px-4 transition-all focus-within:border-primary">
              <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">search</span>
              <input
                className="flex w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 px-3 text-base"
                placeholder="Buscar por nome, especialidade ou ID do documento..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
          {/* Seletor de itens por página */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showFilters || statusFilter !== 'all' || dateFrom || dateTo
                ? 'bg-primary/10 border-primary text-primary'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
            >
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filtros
              {(statusFilter !== 'all' || dateFrom || dateTo) && (
                <span className="size-2 rounded-full bg-primary"></span>
              )}
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">Exibir:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-gray-900 dark:text-white px-3 py-2 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Painel de Filtros Avançados */}
        {showFilters && (
          <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="Draft">Rascunho</option>
                  <option value="Final">Finalizado</option>
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Data de</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Data até</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={() => { setStatusFilter('all'); setDateFrom(''); setDateTo(''); setCurrentPage(1); }}
                className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111318] shadow-sm min-h-[300px]">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col h-64 items-center justify-center text-gray-500 dark:text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2">folder_off</span>
              <p>Nenhum documento encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#1c1f27] border-b border-gray-200 dark:border-gray-800">
                    <th className="px-6 py-4 text-left text-gray-900 dark:text-white text-sm font-semibold leading-normal">Documento</th>
                    <th className="px-6 py-4 text-left text-gray-900 dark:text-white text-sm font-semibold leading-normal hidden md:table-cell">Especialidade / Agente</th>
                    <th className="px-6 py-4 text-left text-gray-900 dark:text-white text-sm font-semibold leading-normal hidden lg:table-cell">Data</th>
                    <th className="px-6 py-4 text-left text-gray-900 dark:text-white text-sm font-semibold leading-normal hidden lg:table-cell">Status</th>
                    <th className="px-6 py-4 text-left text-gray-900 dark:text-white text-sm font-semibold leading-normal">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {paginatedDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-[#1c1f27]/50 transition-colors group">
                      <td className="px-6 py-4 text-gray-900 dark:text-white text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-gray-400 group-hover:text-primary">description</span>
                          <div className="flex flex-col">
                            <span>{doc.title}</span>
                            <span className="md:hidden text-xs text-gray-500 mt-0.5">{doc.specialty}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-[#9da6b9] text-sm hidden md:table-cell max-w-[250px] truncate" title={doc.specialty}>
                        {doc.specialty}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-[#9da6b9] text-sm hidden lg:table-cell">{doc.createdAt}</td>
                      <td className="px-6 py-4 text-sm hidden lg:table-cell">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border
                        ${doc.status === 'Final' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                            'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(doc)}
                            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-[#282e39] dark:text-gray-400 hover:text-primary dark:hover:text-white transition-colors"
                            title="Visualizar / Editar"
                          >
                            <span className="material-symbols-outlined text-xl">visibility</span>
                          </button>

                          {permissions.canDeleteDocuments && (
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="p-2 rounded-md text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                              title="Excluir Documento"
                            >
                              <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Controles de Paginação */}
        {!loading && filteredDocs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredDocs.length)} de {filteredDocs.length} documentos
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="Primeira página"
              >
                <span className="material-symbols-outlined text-sm">first_page</span>
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="Página anterior"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <span className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="Próxima página"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="Última página"
              >
                <span className="material-symbols-outlined text-sm">last_page</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Visualização/Edição MELHORADO */}
      {isModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1C2431] w-full max-w-5xl max-h-[95vh] rounded-xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedDoc.title}</h3>
                  {isEditing && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                      EDITANDO
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">category</span>
                    {selectedDoc.specialty}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                    {selectedDoc.createdAt}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">person</span>
                    {selectedDoc.generatorName}{selectedDoc.generatorOab && ` (OAB: ${selectedDoc.generatorOab})`}
                  </span>
                  {extractDocumentId(selectedDoc.content) && (
                    <span className="flex items-center gap-1 font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                      <span className="material-symbols-outlined text-sm">fingerprint</span>
                      {extractDocumentId(selectedDoc.content)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setIsEditing(false); }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content - Editable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[#111318] p-6">
              <div
                ref={editorRef}
                className={`prose prose-sm sm:prose-base dark:prose-invert max-w-none bg-white dark:bg-[#1C2431] p-8 rounded-lg shadow-sm border transition-all font-sans ${isEditing
                  ? 'border-primary ring-2 ring-primary/20 cursor-text'
                  : 'border-gray-100 dark:border-gray-800'
                  }`}
                contentEditable={isEditing}
                suppressContentEditableWarning={true}
                dangerouslySetInnerHTML={{ __html: selectedDoc.content }}
                onFocus={() => !isEditing && setIsEditing(true)}
              />
              <style>{`
                  table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #ccc; font-size: 0.9em; }
                  th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
                  th { background-color: #f3f4f6; font-weight: bold; }
                  .dark th { background-color: #2a303c; border-color: #374151; color: white; }
                  .dark td { border-color: #374151; color: #d1d5db; }
                  .dark table { border-color: #374151; }
                  [contenteditable]:focus { outline: none; }
              `}</style>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-between gap-3 bg-white dark:bg-[#1C2431] rounded-b-xl">
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                    Editar Documento
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">{isSaving ? 'progress_activity' : 'save'}</span>
                      {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                    <button
                      onClick={() => {
                        if (editorRef.current) {
                          editorRef.current.innerHTML = selectedDoc.content;
                        }
                        setIsEditing(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                      Cancelar
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">content_copy</span>
                  Copiar
                </button>
                <button
                  onClick={async () => {
                    const content = isEditing && editorRef.current ? editorRef.current.innerHTML : selectedDoc.content;
                    try {
                      await downloadAsPDF(content, sanitizeFilename(selectedDoc.title));
                      toast.success('PDF baixado!');
                    } catch (e) {
                      toast.error('Erro ao gerar PDF.');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                  PDF
                </button>
                <button
                  onClick={async () => {
                    const content = isEditing && editorRef.current ? editorRef.current.innerHTML : selectedDoc.content;
                    try {
                      await downloadAsWord(content, sanitizeFilename(selectedDoc.title));
                      toast.success('Word baixado!');
                    } catch (e) {
                      toast.error('Erro ao gerar Word.');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">description</span>
                  Word
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDocuments;