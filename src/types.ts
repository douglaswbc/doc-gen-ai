export interface Document {
  id: string;
  title: string;
  specialty: string;
  type: string;
  content?: string; // Adicionado para visualização
  createdAt: string;
  updatedAt: string;
  status: 'Draft' | 'Final' | 'Review';
  office_id?: string; // Novo
}

export interface Specialty {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
}

export interface SubSpecialty {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Office {
  id: string;
  name: string;
  owner_id: string;
  // Campos existentes
  address?: string | null;
  website?: string | null;
  business_hours?: string | null;
  phone?: string | null;
  // Novos campos para documento timbrado
  cnpj?: string | null;
  email?: string | null;
  logo_url?: string | null;
  secondary_phone?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  slogan?: string | null;
  footer_text?: string | null;
  header_color?: string | null;
}

export type UserRole = 'admin' | 'office' | 'advocate' | 'trainee' | 'assistant';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;

  role: UserRole;
  job_title: string;

  office_id: string | null;
  office?: Office; // Join

  // Novo Campo
  oab?: string | null;

  plan: string;
  documents_generated: number;
  documents_limit: number;
  plan_status: string;
  is_active: boolean;
}

export interface ClientData {
  id?: string;
  name: string;
  nationality: string;
  marital_status: string;
  profession: string;
  birth_date: string;
  cpf: string;
  rg: string;
  rg_issuer: string;
  address: string;

  // Criança
  child_name: string;
  child_cpf: string;
  child_birth_date: string;

  // Benefício
  der: string;
  nb: string;
  benefit_status: string;
  denied_date: string;
  decision_reason: string;
  activity_before_birth: string;
  special_insured_period: string;
  controversial_point: string;
  previous_benefit: string;
  cnis_period: string;
  urban_link: string;

  // Histórico
  rural_start_date: string;
  rural_tasks: string;
  evidence_list: string;
  case_details: string;
  specific_details: string;
}

export interface Signer {
  id: string;
  full_name: string;
  oab: string;
  role: string;
}