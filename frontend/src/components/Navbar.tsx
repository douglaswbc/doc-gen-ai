import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ProfileModal from './ProfileModal';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../context/ThemeContext';

const Navbar: React.FC = () => {
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Extraímos usage, permissions e isAdmin do hook
  // 'usage' contém os dados unificados (escritório ou pessoal)
  const { profile, isAdmin, permissions, usage } = useProfile();
  
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) => {
    const current = location.pathname;
    
    if (path === '/dashboard') {
      return current === '/dashboard' || current.startsWith('/modules') || current.startsWith('/judicial')
        ? 'text-primary bg-primary/10 rounded-lg px-3 py-2 font-bold' 
        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg font-medium';
    }

    if (path === '/my-clients') {
      return current.startsWith('/my-clients') || current.startsWith('/clients')
        ? 'text-primary bg-primary/10 rounded-lg px-3 py-2 font-bold'
        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg font-medium';
    }

    if (path === '/team') {
        return current.startsWith('/team')
          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 font-bold'
          : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg font-medium';
    }

    return current === path 
      ? 'text-primary bg-primary/10 rounded-lg px-3 py-2 font-bold' 
      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg font-medium';
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <>
      <nav className="w-full bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            
            {/* LADO ESQUERDO: Logo e Menu Desktop */}
            <div className="flex items-center gap-4 md:gap-8">
              <button 
                onClick={toggleMobileMenu}
                className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined">
                  {isMobileMenuOpen ? 'close' : 'menu'}
                </span>
              </button>

              <Link to="/dashboard" className="flex items-center gap-2">
                <img src="/logo-dark.png" alt="Logo" className="h-8 w-auto dark:hidden" onError={(e) => e.currentTarget.style.display = 'none'} />
                <img src="/logo-white.png" alt="Logo" className="h-8 w-auto hidden dark:block" onError={(e) => e.currentTarget.style.display = 'none'} />
                <div className="flex items-center gap-2 logo-text-fallback">
                   <h2 className="text-secondary dark:text-white text-xl font-bold tracking-tight">
                     PREV<span className="text-primary">AI</span>
                   </h2>
                </div>
              </Link>
              
              {/* Menu Desktop */}
              <div className="hidden md:flex items-center gap-1">
                <Link to="/dashboard" className={isActive('/dashboard')}>Início</Link>
                
                {/* Documentos */}
                {permissions.canViewDocuments && (
                    <Link to="/my-documents" className={isActive('/my-documents')}>Documentos</Link>
                )}
                
                {/* Clientes */}
                {permissions.canManageClients && (
                    <Link to="/my-clients" className={isActive('/my-clients')}>Clientes</Link>
                )}
                
                {/* Equipe */}
                {permissions.canManageOffice && (
                    <Link 
                        to="/team" 
                        className={`${isActive('/team')} ml-2 !text-blue-600 dark:!text-blue-400 hover:!bg-blue-50 dark:hover:!bg-blue-900/10`} 
                        title="Gerenciar Equipe"
                    >
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-lg">domain</span>
                            <span className="hidden lg:inline text-sm font-bold">Equipe</span>
                        </span>
                    </Link>
                )}

                {/* Admin SaaS */}
                {isAdmin && (
                  <>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                    <Link to="/admin/agents" className={`${isActive('/admin/agents')} !text-purple-600 dark:!text-purple-400 hover:!bg-purple-50 dark:hover:!bg-purple-900/10`}>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">smart_toy</span> IAs
                      </span>
                    </Link>
                    <Link to="/admin/users" className={`${isActive('/admin/users')} !text-purple-600 dark:!text-purple-400 hover:!bg-purple-50 dark:hover:!bg-purple-900/10 ml-1`}>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">group</span> Users
                      </span>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* LADO DIREITO: Tema e Perfil */}
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={toggleTheme} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
              </button>

              {/* CONTADOR DE DOCUMENTOS (GLOBAL/COMPARTILHADO) */}
              {usage && usage.plan === 'free' && (
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700" title="Limite compartilhado do escritório">
                  {usage.generated}/{usage.limit} docs
                </span>
              )}
              
              <button 
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-slate-500">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-lg">person</span>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* MENU MOBILE */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark animate-in slide-in-from-top-2">
            <div className="space-y-1 px-4 py-4">
              <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={`block ${isActive('/dashboard')}`}>Início</Link>
              
              {permissions.canViewDocuments && (
                  <Link to="/my-documents" onClick={() => setIsMobileMenuOpen(false)} className={`block ${isActive('/my-documents')}`}>Documentos</Link>
              )}
              
              {permissions.canManageClients && (
                  <Link to="/my-clients" onClick={() => setIsMobileMenuOpen(false)} className={`block ${isActive('/my-clients')}`}>Clientes</Link>
              )}
              
              {permissions.canManageOffice && (
                  <Link to="/team" onClick={() => setIsMobileMenuOpen(false)} className={`block ${isActive('/team')}`}>
                      <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined">domain</span>
                          Minha Equipe
                      </span>
                  </Link>
              )}
              
              {isAdmin && (
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Administração</p>
                  <Link to="/admin/agents" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-purple-600 dark:text-purple-400 font-bold rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/10 mb-1">
                    <span className="material-symbols-outlined">smart_toy</span> Agentes IA
                  </Link>
                  <Link to="/admin/users" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-purple-600 dark:text-purple-400 font-bold rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/10">
                    <span className="material-symbols-outlined">group</span> Usuários
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
};

export default Navbar;