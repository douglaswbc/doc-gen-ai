import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ProfileModal from './ProfileModal';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../context/ThemeContext';
import UpgradeModal from './UpgradeModal';

const Navbar: React.FC = () => {
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { profile, isAdmin, permissions, usage } = useProfile();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) => {
    const current = location.pathname;
    const activeStyles = "bg-primary text-white shadow-md shadow-primary/20";
    const inactiveStyles = "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white";

    const baseClass = "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 group mb-1";

    if (path === '/dashboard') {
      const active = current === '/dashboard' || current.startsWith('/modules') || current.startsWith('/judicial');
      return `${baseClass} ${active ? activeStyles : inactiveStyles}`;
    }

    if (path === '/my-clients') {
      const active = current.startsWith('/my-clients') || current.startsWith('/clients');
      return `${baseClass} ${active ? activeStyles : inactiveStyles}`;
    }

    const active = current === path;
    return `${baseClass} ${active ? activeStyles : inactiveStyles}`;
  };

  const NavLink = ({ to, label, icon, activePath }: { to: string, label: string, icon: string, activePath?: string }) => (
    <Link to={to} className={isActive(activePath || to)} onClick={() => setIsMobileOpen(false)}>
      <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-sm tracking-tight">{label}</span>
    </Link>
  );

  return (
    <>
      {/* MOBILE HEADER - FIXED AT TOP */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 fixed top-0 left-0 right-0 z-[60] h-16 transition-colors duration-300">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">
            PREV<span className="text-primary">AI</span>
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label="Alternar Tema"
          >
            <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Abrir Menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </div>

      {/* OVERLAY MOBILE */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}

      {/* SIDEBAR SIDEBAR */}
      <aside className={`fixed top-0 left-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-[90] transition-all duration-300 ease-in-out transform 
        ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'} lg:translate-x-0 lg:w-72 flex flex-col shadow-2xl lg:shadow-none`}>

        {/* LOGO AREA */}
        <div className="p-8 pb-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setIsMobileOpen(false)}>
            <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
              PREV<span className="text-primary">AI</span>
            </h2>
          </Link>
          <button onClick={() => setIsMobileOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* NAVIGATION CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
          <div className="mb-8">
            <p className="px-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Principal</p>
            <NavLink to="/dashboard" label="Início" icon="dashboard" />
            {permissions.canViewDocuments && <NavLink to="/my-documents" label="Documentos" icon="description" />}
            {permissions.canManageClients && <NavLink to="/my-clients" label="Clientes" icon="group" />}
          </div>

          <div className="mb-8">
            <p className="px-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Gestão</p>
            {permissions.canManageOffice && (
              <NavLink to="/team" label="Minha Equipe" icon="domain" />
            )}
          </div>

          {isAdmin && (
            <div className="mb-8">
              <p className="px-4 text-[10px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em] mb-4">Sistema</p>
              <NavLink to="/admin/agents" label="Agentes IA" icon="smart_toy" />
              <NavLink to="/admin/users" label="Usuários" icon="account_circle" />
              <NavLink to="/admin/jurisprudence" label="Jurisprudência" icon="gavel" />
              <NavLink to="/admin/jurisdiction" label="Jurisdição" icon="map" />
            </div>
          )}
        </div>

        {/* FOOTER / USER AREA */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          {usage && usage.plan === 'free' && (
            <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">CONSUMO</span>
                <span className="text-[10px] font-bold text-primary">{usage.generated}/{usage.limit}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min((usage.generated / usage.limit) * 100, 100)}%` }}
                ></div>
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black rounded-lg transition-colors flex items-center justify-center gap-1 uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-xs">rocket_launch</span>
                Fazer Upgrade
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-2">
            <button
              onClick={() => { setIsProfileOpen(true); setIsMobileOpen(false); }}
              className="flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition-all duration-200 flex-1"
            >
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/20">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profile?.full_name?.substring(0, 1).toUpperCase() || 'U'
                )}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate transition-colors">{profile?.full_name || 'Usuário'}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{profile?.role || 'Advogado'}</p>
              </div>
            </button>
            <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="Mudar Tema">
              <span className="material-symbols-outlined text-xl">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>
          </div>
        </div>
      </aside>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* === UPGRADE MODAL === */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        usage={usage}
      />
    </>
  );
};

export default Navbar;