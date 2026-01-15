export interface DocumentTask {
  name: string;
}

export interface AgentAction {
  id: string;
  title: string;
  tasks: string[]; // Lista de tarefas (Petição Inicial, Recurso, etc)
}

export interface WorkerCategory {
  id: string;
  title: string; // Ex: "Agricultores", "Pescadores"
  agents: AgentAction[];
}

export interface Sphere {
  id: 'rural' | 'urbana';
  title: string;
  categories: WorkerCategory[];
}