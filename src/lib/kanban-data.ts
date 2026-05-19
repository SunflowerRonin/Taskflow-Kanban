import type { Column } from '../types/kanban'

export const initialColumns = [
  {
    id: 'todo',
    title: 'A Fazer',
    cards: [
      { id: '1', title: 'Criar tela de login', description: 'Implementar autenticação JWT', priority: 'alta' as const, assignee: 'Ana', dueDate: '2025-06-01', tags: ['frontend'], columnId: 'todo' },
    ],
  },
  {
    id: 'in-progress',
    title: 'Em Andamento',
    cards: [
      { id: '2', title: 'API de usuários', description: 'CRUD completo no backend', priority: 'alta' as const, assignee: 'Carlos', dueDate: '2025-05-28', tags: ['backend'], columnId: 'in-progress' },
    ],
  },
  {
    id: 'review',
    title: 'Em Revisão',
    cards: [],
  },
  {
    id: 'done',
    title: 'Concluído',
    cards: [
      { id: '3', title: 'Setup do projeto', description: 'Configurar Next.js e dependências', priority: 'baixa' as const, assignee: 'Ana', dueDate: '2025-05-20', tags: ['devops'], columnId: 'done' },
    ],
  },
]