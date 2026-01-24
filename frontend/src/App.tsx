import React from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import LandingPage from './pages/LandingPage'; // <--- Import Novo
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import CreateDocument from './pages/CreateDocument';
import MyDocuments from './pages/MyDocuments';
import MyClients from './pages/MyClients';
import ClientDetails from './pages/ClientDetails';
import AdminAgents from './pages/admin/Agents';
import AdminUsers from './pages/admin/Users';
import JurisprudenceAdmin from './pages/admin/Jurisprudence';
import JurisdictionAdmin from './pages/admin/Jurisdiction';
import Team from './pages/office/Team';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

// Novas Páginas Dinâmicas
import SphereSelection from './pages/SphereSelection';
import AgentSelection from './pages/judicial/AgentSelection';

import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useProfile } from './hooks/useProfile';

// Componente para rotas protegidas
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-background-dark"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>;
  if (!session) return <Navigate to="/login" replace />; // <--- Redireciona para /login agora
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useProfile();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>;
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const hideSidebarPaths = ['/', '/login', '/register', '/forgot-password', '/terms', '/privacy'];
  const showSidebar = !hideSidebarPaths.includes(location.pathname);

  return (
    <div className="min-h-screen flex transition-colors duration-300 bg-slate-50 dark:bg-background-dark">
      {showSidebar && <Navbar />}
      <div className={`flex flex-col flex-1 w-full ${showSidebar ? 'lg:pl-72 pt-16 lg:pt-0' : ''}`}>
        <main className="flex-grow">
          {children}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Layout>
            <ToastContainer
              position="top-right"
              autoClose={3000}
              theme="colored"
              aria-label="Notificações do sistema"
            />
            <Routes>
              {/* ROTA RAIZ AGORA É A LANDING PAGE */}
              <Route path="/" element={<LandingPage />} />

              {/* PÁGINAS LEGAIS */}
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* Login agora é /login */}
              <Route path="/login" element={<Login />} />

              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* App Protegido */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/create-document" element={<ProtectedRoute><CreateDocument /></ProtectedRoute>} />
              <Route path="/clients/:clientId/create-document" element={<ProtectedRoute><CreateDocument /></ProtectedRoute>} />
              <Route path="/my-documents" element={<ProtectedRoute><MyDocuments /></ProtectedRoute>} />
              <Route path="/my-clients" element={<ProtectedRoute><MyClients /></ProtectedRoute>} />
              <Route path="/clients/:id" element={<ProtectedRoute><ClientDetails /></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />

              {/* Rotas Dinâmicas */}
              <Route path="/modules/:module" element={<ProtectedRoute><SphereSelection /></ProtectedRoute>} />
              <Route path="/clients/:clientId/modules/:module" element={<ProtectedRoute><SphereSelection /></ProtectedRoute>} />
              <Route path="/modules/:module/:sphere" element={<ProtectedRoute><AgentSelection /></ProtectedRoute>} />
              <Route path="/clients/:clientId/modules/:module/:sphere" element={<ProtectedRoute><AgentSelection /></ProtectedRoute>} />

              <Route path="/judicial" element={<Navigate to="/modules/Judicial" replace />} />
              <Route path="/judicial/:sphere" element={<ProtectedRoute><AgentSelection /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin/agents" element={<ProtectedRoute><AdminRoute><AdminAgents /></AdminRoute></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><AdminUsers /></AdminRoute></ProtectedRoute>} />
              <Route path="/admin/jurisprudence" element={<ProtectedRoute><AdminRoute><JurisprudenceAdmin /></AdminRoute></ProtectedRoute>} />
              <Route path="/admin/jurisdiction" element={<ProtectedRoute><AdminRoute><JurisdictionAdmin /></AdminRoute></ProtectedRoute>} />

              {/* 404 Redireciona para Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;