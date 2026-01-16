import React from 'react';
import { Link } from 'react-router-dom';

const JudicialSphere: React.FC = () => {
  return (
    <div className="flex flex-col w-full h-full px-4 sm:px-10 lg:px-20 py-8">
      <div className="mx-auto flex flex-col w-full max-w-7xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/dashboard" className="hover:text-primary">Dashboard</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-gray-900 dark:text-white font-medium">Demandas Judiciais</span>
        </div>

        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-8">Selecione a Esfera de Atuação</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Rural */}
          <Link to="/judicial/rural" className="group relative overflow-hidden rounded-2xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 p-8 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-9xl">agriculture</span>
            </div>
            <div className="relative z-10">
              <span className="material-symbols-outlined text-4xl text-green-600 mb-4">agriculture</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Trabalhadores da Esfera Rural</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Agricultores, Pescadores Artesanais e Segurados Especiais.</p>
              <span className="inline-flex items-center text-primary font-bold">
                Ver Agentes <span className="material-symbols-outlined ml-2">arrow_forward</span>
              </span>
            </div>
          </Link>

          {/* Card Urbano */}
          <Link to="/judicial/urbana" className="group relative overflow-hidden rounded-2xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 p-8 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-9xl">domain</span>
            </div>
            <div className="relative z-10">
              <span className="material-symbols-outlined text-4xl text-blue-600 mb-4">domain</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Trabalhadores da Esfera Urbana</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Trabalhadores CLT, Contribuintes Individuais e Aposentadorias Especiais.</p>
              <span className="inline-flex items-center text-primary font-bold">
                Ver Agentes <span className="material-symbols-outlined ml-2">arrow_forward</span>
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default JudicialSphere;