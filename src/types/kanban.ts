export type Priority = 'baixa' | 'média' | 'alta'
export type Status = 'todo' | 'in-progress' | 'review' | 'done'

export type Attachment = {
  name: string
  url: string
  size: number
  uploadedAt: string
}

export type Card = {
  id: string
  title: string
  description: string
  priority: Priority
  assignee: string
  assigneeId?: string
  dueDate: string
  tags: string[]
  columnId: string
  status: Status
  history?: { status: string; changedAt: string; changedBy?: string }[]
  attachments?: Attachment[]
}

export type Column = {
  id: string
  title: string
  cards: Card[]
}