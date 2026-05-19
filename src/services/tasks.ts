import { api } from './api'
import type { Card, Status } from '../types/kanban'

type ApiTask = {
  id: string
  title: string
  description: string
  status: Status
  priority: 'baixa' | 'média' | 'alta'
  dueDate: string
  tags: string[]
  assigneeId: string
  assignee?: { id: string; name: string; email: string }
  history?: { status: string; changedAt: string; changedBy?: string }[]
  attachments?: { name: string; url: string; size: number; uploadedAt: string }[]
}

function mapToCard(task: ApiTask): Card {
  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    assignee: task.assignee?.name || '',
    assigneeId: task.assigneeId,
    dueDate: task.dueDate || '',
    tags: task.tags || [],
    columnId: task.status,
    status: task.status,
    history: task.history || [],
    attachments: task.attachments || [],
  }
}

export async function getTasks(): Promise<Card[]> {
  const tasks = await api.get<ApiTask[]>('/tasks')
  return tasks.map(mapToCard)
}

export async function createTask(data: Partial<Card>): Promise<Card> {
  const task = await api.post<ApiTask>('/tasks', {
    title: data.title,
    description: data.description,
    priority: data.priority,
    dueDate: data.dueDate,
    tags: data.tags,
    status: data.columnId || 'todo',
  })
  return mapToCard(task)
}

export async function updateTask(id: string, data: Partial<Card>): Promise<Card> {
  const task = await api.put<ApiTask>(`/tasks/${id}`, {
    title: data.title,
    description: data.description,
    priority: data.priority,
    dueDate: data.dueDate,
    tags: data.tags,
    status: data.columnId ?? data.status,
    assigneeId: data.assigneeId,
  })
  return mapToCard(task)
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`)
}

export async function uploadAttachment(taskId: string, file: File): Promise<Card> {
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`http://localhost:3001/tasks/${taskId}/attachments`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  })
  if (!res.ok) throw new Error('Erro ao enviar anexo')
  const task = await res.json()
  return mapToCard(task)
}

export async function removeAttachment(taskId: string, filename: string): Promise<Card> {
  const task = await api.delete<ApiTask>(`/tasks/${taskId}/attachments/${filename}`)
  return mapToCard(task)
}