import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { SubSpecialty } from '../types';

const subSpecialties: SubSpecialty[] = [
  { id: 'civil', name: 'Direito Civil', description: 'Relações jurídicas entre pessoas.', icon: 'balance' },
  { id: 'penal', name: 'Direito Penal', description: 'Crimes, delitos e suas penas.', icon: 'gavel' },
  { id: 'labor', name: 'Direito Trabalhista', description: 'Relações entre empregados e empregadores.', icon: 'work' },
  { id: 'tax', name: 'Direito Tributário', description: 'Regras sobre arrecadação de impostos.', icon: 'receipt_long' },
  { id: 'business', name: 'Direito Empresarial', description: 'Normas sobre atividades empresariais.', icon: 'corporate_fare' },
  { id: 'admin', name: 'Direito Administrativo', description: 'Regula a função administrativa do Estado.', icon: 'account_balance' },
  { id: 'family', name: 'Direito de Família', description: 'Normas sobre relações familiares.', icon: 'diversity_1' },
  { id: 'international', name: 'Direito Internacional', description: 'Relações entre diferentes nações.', icon: 'public' },
];

const Specialties: React.FC = () => {
  const { category } = useParams<{ category: string }>();

  // Mock: Typically fetch based on category
  const title = category === 'law' ? 'Direito' : category === 'marketing' ? 'Marketing' : 'Especialidade';

  return (
    <div className="flex flex-col w-full h-full px-4 sm:px-10 lg:px-20 py-8">
      <div className="mx-auto flex flex-col w-full max-w-7xl">
        {/* Breadcrumbs */}
        <div className="flex flex-wrap gap-2 mb-6 text-sm">
          <Link to="/dashboard" className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary">Home</Link>
          <span className="text-gray-500 dark:text-gray-400">/</span>
          <Link to="/dashboard" className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary">Especialidades</Link>
          <span className="text-gray-500 dark:text-gray-400">/</span>
          <span className="text-gray-900 dark:text-white font-medium capitalize">{title}</span>
        </div>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          {/* Left Sidebar */}
          <aside className="w-full md:w-64 lg:w-72 flex-shrink-0">
            <div className="sticky top-28 flex flex-col gap-4">
              <div className="flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-card-dark p-6 shadow-sm">
                <div className="text-primary">
                  <span className="material-symbols-outlined !text-4xl">gavel</span>
                </div>
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold leading-tight capitalize">{title}</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">Especialidade Selecionada</p>
                </div>
              </div>
              <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary px-2 transition-colors">
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Voltar para Especialidades
              </Link>
            </div>
          </aside>

          {/* Right Content */}
          <div className="flex-1">
            <div className="flex flex-wrap justify-between gap-3 mb-8">
              <h1 className="text-3xl lg:text-4xl font-black leading-tight tracking-[-0.033em]">Selecione uma área do {title}</h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {subSpecialties.map((item) => (
                <Link 
                  key={item.id}
                  to={`/create-document?type=${encodeURIComponent(item.name)}&category=${category}`}
                  className="group flex flex-1 flex-col gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-card-dark p-5 hover:border-primary dark:hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="text-primary group-hover:scale-110 transition-transform duration-200">
                    <span className="material-symbols-outlined !text-3xl">{item.icon}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-base font-bold leading-tight text-gray-900 dark:text-white">{item.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Specialties;
