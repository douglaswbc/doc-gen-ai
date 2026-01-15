import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase'; // Importe o supabase
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { toast } from 'react-toastify';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const {
    profile,
    updateProfile,
    updateOffice,
    uploadAvatar,
    permissions,
    isOfficeOwner, // Importante para a Zona de Perigo
    loading
  } = useProfile();

  const [activeTab, setActiveTab] = useState<'profile' | 'office' | 'security'>('profile');

  // Estados do Formulário Pessoal
  const [fullName, setFullName] = useState('');
  const [oab, setOab] = useState('');

  // Estados do Formulário Escritório
  const [officeName, setOfficeName] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [officeWebsite, setOfficeWebsite] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [officeCnpj, setOfficeCnpj] = useState('');
  const [officeEmail, setOfficeEmail] = useState('');
  const [officeSecondaryPhone, setOfficeSecondaryPhone] = useState('');
  const [officeCity, setOfficeCity] = useState('');
  const [officeState, setOfficeState] = useState('');
  const [officeSlogan, setOfficeSlogan] = useState('');
  const [officeLogoUrl, setOfficeLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Estados de Segurança (Senha)
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setOab(profile.oab || '');

      if (profile.office) {
        setOfficeName(profile.office.name || '');
        setOfficeAddress(profile.office.address || '');
        setOfficeWebsite(profile.office.website || '');
        setOfficePhone(profile.office.phone || '');
        setOfficeCnpj(profile.office.cnpj || '');
        setOfficeEmail(profile.office.email || '');
        setOfficeSecondaryPhone(profile.office.secondary_phone || '');
        setOfficeCity(profile.office.city || '');
        setOfficeState(profile.office.state || '');
        setOfficeSlogan(profile.office.slogan || '');
        setOfficeLogoUrl(profile.office.logo_url || '');
      }
    }
  }, [profile]);

  if (!isOpen) return null;

  // --- HANDLERS ---

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        oab: oab
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOfficeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.office_id) return;

    setSaving(true);
    try {
      await updateOffice(profile.office_id, {
        name: officeName,
        address: officeAddress,
        website: officeWebsite,
        phone: officePhone,
        cnpj: officeCnpj,
        email: officeEmail,
        secondary_phone: officeSecondaryPhone,
        city: officeCity,
        state: officeState,
        slogan: officeSlogan,
        logo_url: officeLogoUrl
      });
    } finally {
      setSaving(false);
    }
  };

  // Upload de logo do escritório

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !profile?.office_id) return;

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.office_id}/logo.${fileExt}`;

    setUploadingLogo(true);
    try {
      // Upload para o bucket office-logos
      const { error: uploadError } = await supabase.storage
        .from('office-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Pega a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('office-logos')
        .getPublicUrl(fileName);

      // Atualiza o estado local e o banco
      setOfficeLogoUrl(publicUrl);
      await updateOffice(profile.office_id, { logo_url: publicUrl });

      toast.success('Logo atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error('As senhas não coincidem.');

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;

      toast.success('Senha alterada com sucesso!');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Erro ao alterar senha.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("ATENÇÃO: Essa ação é irreversível e apagará todos os dados do escritório. Tem certeza?")) return;
    try {
      // Nota: A exclusão real do usuário no Supabase Auth geralmente requer uma Edge Function ou chamada de Admin API.
      // Aqui estamos apenas fazendo o logout e simulando o fluxo.
      await signOut();
      toast.info("Conta encerrada.");
      window.location.href = '/';
    } catch (error) {
      toast.error("Erro ao processar.");
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      await uploadAvatar(event.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-card-dark w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col md:flex-row h-[600px] md:h-auto max-h-[90vh] overflow-hidden">

        {/* SIDEBAR DO MODAL */}
        <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-2 overflow-y-auto">
          <h3 className="text-lg font-bold px-4 mb-2 text-slate-800 dark:text-white">Minha Conta</h3>

          <button onClick={() => setActiveTab('profile')} className={`text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeTab === 'profile' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <span className="material-symbols-outlined">person</span> Dados Pessoais
          </button>

          {/* SÓ MOSTRA ABA ESCRITÓRIO SE TIVER PERMISSÃO */}
          {permissions.canManageOffice && (
            <button onClick={() => setActiveTab('office')} className={`text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeTab === 'office' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <span className="material-symbols-outlined">business</span> Meu Escritório
            </button>
          )}

          <button onClick={() => setActiveTab('security')} className={`text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeTab === 'security' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <span className="material-symbols-outlined">lock</span> Segurança
          </button>

          <div className="mt-auto pt-4 md:border-t border-slate-200 dark:border-slate-800">
            <button onClick={() => { signOut(); onClose(); window.location.href = '/'; }} className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
              <span className="material-symbols-outlined">logout</span> Sair da Conta
            </button>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-8 relative custom-scrollbar">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">close</span>
          </button>

          {/* === ABA: DADOS PESSOAIS === */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                  <div className="size-24 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
                    {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-4xl text-slate-400 w-full h-full flex items-center justify-center">person</span>}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white">photo_camera</span>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{profile?.full_name}</h2>
                  <p className="text-slate-500">{profile?.email}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                    {profile?.role === 'office' ? 'Sócio / Dono' : profile?.job_title}
                  </span>
                </div>
              </div>

              <form onSubmit={handlePersonalSubmit} className="space-y-4 max-w-lg">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Nome Completo</span>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-2 focus:ring-primary outline-none" />
                </label>

                {/* Só mostra OAB se tiver permissão (Advogado/Dono) */}
                {permissions.needsOAB && (
                  <label className="block">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Registro OAB (Número/UF)</span>
                    <input
                      type="text"
                      value={oab}
                      onChange={e => setOab(e.target.value)}
                      className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Ex: 123456/SP"
                    />
                    <p className="text-xs text-slate-500 mt-1">Necessário para qualificação em petições.</p>
                  </label>
                )}

                <div className="pt-4">
                  <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20">
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* === ABA: ESCRITÓRIO (Só Dono) === */}
          {activeTab === 'office' && permissions.canManageOffice && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dados da Empresa</h2>
                <p className="text-sm text-slate-500">Essas informações aparecerão no cabeçalho dos documentos.</p>
              </div>

              {/* Upload de Logo */}
              <div className="flex items-start gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="relative group cursor-pointer shrink-0" onClick={() => logoInputRef.current?.click()}>
                  <div className="size-24 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
                    {officeLogoUrl ? (
                      <img src={officeLogoUrl} className="w-full h-full object-contain p-1" alt="Logo" />
                    ) : (
                      <span className="material-symbols-outlined text-3xl text-slate-400">add_photo_alternate</span>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingLogo ? (
                      <span className="material-symbols-outlined text-white animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-white">upload</span>
                    )}
                  </div>
                  <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Logo do Escritório</h3>
                  <p className="text-sm text-slate-500 mt-1">Recomendado: imagem quadrada PNG ou JPG.</p>
                  <p className="text-xs text-slate-400 mt-1">A logo aparecerá no cabeçalho dos documentos.</p>
                </div>
              </div>

              <form onSubmit={handleOfficeSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="col-span-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Nome do Escritório</span>
                  <input type="text" value={officeName} onChange={e => setOfficeName(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-2 focus:ring-primary outline-none" />
                </label>

                <label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">CNPJ</span>
                  <input type="text" value={officeCnpj} onChange={e => setOfficeCnpj(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-2 focus:ring-primary outline-none" placeholder="00.000.000/0001-00" />
                </label>

                <label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">E-mail</span>
                  <input type="email" value={officeEmail} onChange={e => setOfficeEmail(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-2 focus:ring-primary outline-none" placeholder="contato@escritorio.com" />
                </label>

                <label className="col-span-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Endereço Completo</span>
                  <input type="text" value={officeAddress} onChange={e => setOfficeAddress(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-2 focus:ring-primary outline-none" placeholder="Rua, Número, Bairro" />
                </label>

                <label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Cidade</span>
                  <input type="text" value={officeCity} onChange={e => setOfficeCity(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-2 focus:ring-primary outline-none" />
                </label>

                <label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Estado (UF)</span>
                  <input type="text" value={officeState} onChange={e => setOfficeState(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: PA" maxLength={2} />
                </label>

                <label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Telefone Principal</span>
                  <input type="text" value={officePhone} onChange={e => setOfficePhone(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-2 focus:ring-primary outline-none" placeholder="(00) 00000-0000" />
                </label>

                <label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Telefone Secundário</span>
                  <input type="text" value={officeSecondaryPhone} onChange={e => setOfficeSecondaryPhone(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-2 focus:ring-primary outline-none" placeholder="(00) 00000-0000" />
                </label>

                <label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Website</span>
                  <input type="text" value={officeWebsite} onChange={e => setOfficeWebsite(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-2 focus:ring-primary outline-none" placeholder="www.seuescritorio.com.br" />
                </label>

                <label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Slogan (Opcional)</span>
                  <input type="text" value={officeSlogan} onChange={e => setOfficeSlogan(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-2 focus:ring-primary outline-none" placeholder="Sua frase ou lema" />
                </label>

                <div className="col-span-2 pt-4">
                  <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20">
                    {saving ? 'Salvando...' : 'Salvar Dados do Escritório'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* === ABA: SEGURANÇA (COM FORMULÁRIO) === */}
          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900/30 flex items-start gap-3">
                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-500 mt-0.5">lock</span>
                <div>
                  <h5 className="font-bold text-yellow-800 dark:text-yellow-500 text-sm">Segurança da Conta</h5>
                  <p className="text-xs text-yellow-700 dark:text-yellow-600 mt-1">Recomendamos usar uma senha forte com letras, números e símbolos.</p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Nova Senha</span>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-2 focus:ring-primary outline-none" placeholder="••••••••" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirmar Nova Senha</span>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 focus:ring-2 focus:ring-primary outline-none" placeholder="••••••••" />
                </label>
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={saving || !password} className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50">
                    {saving ? 'Salvando...' : 'Atualizar Senha'}
                  </button>
                </div>
              </form>

              {/* ZONA DE PERIGO (Só para Dono) */}
              {isOfficeOwner && (
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6 mt-6">
                  <h4 className="text-lg font-bold text-red-600 flex items-center gap-2">
                    <span className="material-symbols-outlined">warning</span> Zona de Perigo
                  </h4>
                  <p className="text-sm text-slate-500 mb-4 mt-1">A exclusão da conta removerá o acesso de toda a equipe e apagará todos os documentos do escritório.</p>
                  <button onClick={handleDeleteAccount} className="px-4 py-2 border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-all">Excluir Conta do Escritório</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;