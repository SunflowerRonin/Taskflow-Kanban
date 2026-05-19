'use client'

import { useState, useEffect } from 'react'
import {
  DndContext, PointerSensor, useSensor, useSensors,
  closestCorners, useDroppable, DragOverlay,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  getTasks, createTask, updateTask, deleteTask,
  uploadAttachment, removeAttachment,
} from '../../services/tasks'
import { getUsers } from '../../services/users'
import { api } from '../../services/api'
import { importFromBitrix, exportToBitrix } from '../../services/bitrix'
import type { Card, Column, Priority } from '../../types/kanban'
import type { User } from '../../services/users'

const COLUMNS: Column[] = [
  { id: 'todo', title: 'A Fazer', cards: [] },
  { id: 'in-progress', title: 'Em Andamento', cards: [] },
  { id: 'review', title: 'Em Revisão', cards: [] },
  { id: 'done', title: 'Concluído', cards: [] },
]

const priorityStyles: Record<Priority, string> = {
  alta: 'bg-error text-error-content',
  média: 'bg-warning text-warning-content',
  baixa: 'bg-success text-success-content',
}

function KanbanCard({ card, onEdit, overlay = false }: {
  card: Card; onEdit: (card: Card) => void; overlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onDoubleClick={() => !overlay && onEdit(card)}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging && !overlay ? 0.3 : 1 }}
      className="bg-base-100 rounded-xl border border-base-300 shadow-sm select-none p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-base-content text-sm">{card.title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${priorityStyles[card.priority]}`}>{card.priority}</span>
      </div>
      {card.description && (
        <p className="text-xs text-base-content/60 line-clamp-2">{card.description.replace(/\[bitrix:\d+\]\s?/, '')}</p>
      )}
      <div className="flex flex-wrap gap-1">
        {card.tags?.map(tag => (
          <span key={tag} className="text-xs px-2 py-0.5 rounded-full border border-base-content/30 text-base-content/60">{tag}</span>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold">
            {card.assignee?.[0] || '?'}
          </div>
          {card.assignee && <span className="text-xs text-base-content/50">{card.assignee}</span>}
        </div>
        <div className="flex items-center gap-2">
          {card.attachments && card.attachments.length > 0 && (
            <span className="text-xs text-base-content/40">📎 {card.attachments.length}</span>
          )}
          <span className="text-xs text-base-content/50">{card.dueDate}</span>
        </div>
      </div>
    </div>
  )
}

function KanbanColumn({ column, onEdit }: { column: Column; onEdit: (card: Card) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  return (
    <div ref={setNodeRef} className={`flex flex-col rounded-xl p-3 w-72 shrink-0 transition-colors ${isOver ? 'bg-base-300' : 'bg-base-200'}`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-semibold text-base-content">{column.title}</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-base-300 text-base-content/60">{column.cards.length}</span>
      </div>
      <SortableContext items={column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-24 rounded-lg p-1">
          {column.cards.map(card => <KanbanCard key={card.id} card={card} onEdit={onEdit} />)}
        </div>
      </SortableContext>
    </div>
  )
}

function CardModal({ open, onClose, onSave, onDelete, onExport, editCard, columns, users }: {
  open: boolean
  onClose: () => void
  onSave: (card: Card) => void
  onDelete: (id: string) => void
  onExport?: (id: string) => void
  editCard: Card | null
  columns: { id: string; title: string }[]
  users: User[]
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState<Priority>('baixa')
  const [dueDate, setDueDate] = useState('')
  const [columnId, setColumnId] = useState(columns[0]?.id || '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [localCard, setLocalCard] = useState<Card | null>(null)

  useEffect(() => {
    setLocalCard(editCard)

    if (editCard) {
      setTitle(editCard.title)
      setDescription(editCard.description)
      setAssigneeId(editCard.assigneeId || '')
      setPriority(editCard.priority)
      setDueDate(editCard.dueDate)
      setColumnId(editCard.columnId)
      setTags(editCard.tags || [])
    } else {
      setTitle('')
      setDescription('')
      setAssigneeId('')
      setPriority('baixa')
      setDueDate('')
      setColumnId(columns[0]?.id || '')
      setTags([])
    }

    setConfirmarExclusao(false)
  }, [editCard, open])

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleSave = () => {
    if (!title.trim()) return

    const selectedUser = users.find(u => u.id === assigneeId)

    onSave({
      id: editCard?.id ?? '',
      title,
      description,
      assignee: selectedUser?.name || '',
      assigneeId: assigneeId || undefined,
      priority,
      dueDate,
      tags,
      columnId,
      status: columnId as any,
      history: editCard?.history || [],
      attachments: localCard?.attachments || [],
    })
    onClose()
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !localCard?.id) return
    setUploading(true)
    try {
      const updated = await uploadAttachment(localCard.id, file)
      setLocalCard(updated)
      onSave(updated)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemoveAttachment = async (filename: string) => {
    if (!localCard?.id) return
    const updated = await removeAttachment(localCard.id, filename)
    setLocalCard(updated)
    onSave(updated)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-base-100 rounded-2xl shadow-2xl w-full max-w-md flex flex-col z-10 max-h-[90vh]">
        <div className="p-6 pb-4 border-b border-base-300 flex items-center justify-between">
          <h2 className="text-lg font-bold text-base-content">{editCard ? 'Editar Card' : 'Novo Card'}</h2>
          {editCard?.id && onExport && (
            <button
              onClick={() => onExport(editCard.id)}
              className="text-xs px-3 py-1.5 rounded-lg bg-base-200 hover:bg-base-300 text-base-content/70 transition-colors"
            >↑ Bitrix24</button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Título *</label>
            <input className="w-full rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Descrição</label>
            <textarea className="w-full rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-sm resize-none outline-none focus:border-primary" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Responsável</label>
              <select className="w-full rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-sm outline-none focus:border-primary" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                <option value="">Sem responsável</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Prioridade</label>
              <select className="w-full rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-sm outline-none focus:border-primary" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                <option value="baixa">Baixa</option>
                <option value="média">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Data de entrega</label>
              <input type="date" className="w-full rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-sm outline-none focus:border-primary" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Coluna</label>
              <select className="w-full rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-sm outline-none focus:border-primary" value={columnId} onChange={e => setColumnId(e.target.value)}>
                {columns.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Tags</label>
            <div className="flex gap-2">
              <input className="flex-1 rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-sm outline-none focus:border-primary" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} placeholder="Adicionar tag" />
              <button onClick={handleAddTag} className="px-3 py-2 rounded-lg bg-base-300 hover:bg-base-200 text-sm transition-colors">+</button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.map(tag => (
                <span key={tag} onClick={() => setTags(tags.filter(t => t !== tag))} className="text-xs px-2 py-0.5 rounded-full border border-base-content/30 text-base-content/60 cursor-pointer hover:text-error transition-colors">
                  {tag} ×
                </span>
              ))}
            </div>
          </div>

          {localCard?.history && localCard.history.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Histórico</label>
              <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
                {localCard.history.map((h, i) => (
                  <div key={i} className="text-xs text-base-content/60 bg-base-200 rounded px-2 py-1">
                    Status alterado para <strong>{h.status}</strong> em {new Date(h.changedAt).toLocaleString('pt-BR')}
                    {h.changedBy && ` por ${h.changedBy}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {localCard?.id && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Anexos</label>
                <label className={`cursor-pointer text-xs px-3 py-1.5 rounded-lg bg-base-300 hover:bg-base-200 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploading ? 'Enviando...' : '+ Anexar arquivo'}
                  <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>
              {localCard.attachments && localCard.attachments.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {localCard.attachments.map((att, i) => {
                    const filename = att.url.split('/').pop() || ''
                    const kb = Math.round(att.size / 1024)
                    return (
                      <div key={i} className="flex items-center justify-between bg-base-200 rounded-lg px-3 py-2 gap-2">
                        <a href={`http://localhost:3001${att.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate flex-1">
                          📎 {att.name} <span className="text-base-content/40">({kb}kb)</span>
                        </a>
                        <button onClick={() => handleRemoveAttachment(filename)} className="text-xs text-error hover:opacity-70 shrink-0 transition-opacity">✕</button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-base-content/40">Nenhum anexo ainda.</p>
              )}
            </div>
          )}
        </div>

        <div className="p-6 pt-4 border-t border-base-300 flex gap-2 justify-between">
          {editCard && (
            <div>
              {!confirmarExclusao ? (
                <button onClick={() => setConfirmarExclusao(true)} className="px-4 py-2 rounded-lg bg-error/10 text-error text-sm hover:bg-error/20 transition-colors">Excluir</button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-error">Tem certeza?</span>
                  <button onClick={() => { onDelete(editCard.id); onClose() }} className="px-3 py-1.5 rounded-lg bg-error text-error-content text-xs font-medium">Sim</button>
                  <button onClick={() => setConfirmarExclusao(false)} className="px-3 py-1.5 rounded-lg bg-base-300 text-base-content text-xs">Não</button>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-base-300 text-sm hover:bg-base-200 transition-colors">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-content text-sm font-medium hover:opacity-90 transition-opacity">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(COLUMNS)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCard, setEditCard] = useState<Card | null>(null)
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    Promise.all([getTasks(), getUsers()]).then(([cards, userList]) => {
      setColumns(COLUMNS.map(col => ({
        ...col,
        cards: cards.filter(c => c.columnId === col.id),
      })))
      setUsers(userList)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const findColumn = (id: string) =>
    columns.find(col => col.id === id || col.cards.some(c => c.id === id))

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = String(event.active.id)
    const col = columns.find(c => c.cards.some(card => card.id === cardId))
    setActiveCard(col?.cards.find(c => c.id === cardId) ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null)
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return
    const sourceCol = findColumn(activeId)
    const destCol = findColumn(overId)
    if (!sourceCol || !destCol) return

    if (sourceCol.id === destCol.id) {
      const oldIndex = sourceCol.cards.findIndex(c => c.id === activeId)
      const newIndex = sourceCol.cards.findIndex(c => c.id === overId)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(sourceCol.cards, oldIndex, newIndex)
      setColumns(prev => prev.map(col => col.id === sourceCol.id ? { ...col, cards: reordered } : col))
      await api.put('tasks/reorder/batch', { ids: reordered.map(c => c.id) })
      return
    }

    const card = sourceCol.cards.find(c => c.id === activeId)!
    const updatedCard = { ...card, columnId: destCol.id, status: destCol.id as any }
    const overIsCard = destCol.cards.some(c => c.id === overId)
    const insertIndex = overIsCard ? destCol.cards.findIndex(c => c.id === overId) : destCol.cards.length

    setColumns(prev => prev.map(col => {
      if (col.id === sourceCol.id) return { ...col, cards: col.cards.filter(c => c.id !== activeId) }
      if (col.id === destCol.id) {
        const newCards = [...col.cards.filter(c => c.id !== activeId)]
        newCards.splice(insertIndex, 0, updatedCard)
        return { ...col, cards: newCards }
      }
      return col
    }))
    await updateTask(activeId, updatedCard)
  }

  const handleSaveCard = async (card: Card) => {
    if (card.id) {
      const updated = await updateTask(card.id, card)
      setColumns(prev => prev.map(col => ({
        ...col,
        cards: col.id === updated.columnId
          ? col.cards.some(c => c.id === updated.id)
            ? col.cards.map(c => c.id === updated.id ? updated : c)
            : [...col.cards.filter(c => c.id !== updated.id), updated]
          : col.cards.filter(c => c.id !== updated.id),
      })))
      setEditCard(prev => prev?.id === updated.id ? updated : prev)
    } else {
      const created = await createTask(card)
      setColumns(prev => prev.map(col =>
        col.id === created.columnId ? { ...col, cards: [...col.cards, created] } : col
      ))
      setModalOpen(false)
      setEditCard(null)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    await deleteTask(cardId)
    setColumns(prev => prev.map(col => ({ ...col, cards: col.cards.filter(c => c.id !== cardId) })))
  }

  const handleImportBitrix = async () => {
    setImporting(true)
    setImportResult(null)
    try {
      const result = await importFromBitrix()
      setImportResult(result)
      const cards = await getTasks()
      setColumns(COLUMNS.map(col => ({ ...col, cards: cards.filter(c => c.columnId === col.id) })))
    } catch (e: any) {
      alert(e.message || 'Erro ao importar do Bitrix24')
    } finally {
      setImporting(false)
    }
  }

  const handleExportBitrix = async (id: string) => {
    try {
      const result = await exportToBitrix(id)
      alert(`Exportado com sucesso! ID Bitrix24: ${result.bitrixId}`)
    } catch (e: any) {
      alert(e.message || 'Erro ao exportar para Bitrix24')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  )

  return (
    <>
      <CardModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditCard(null) }}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
        onExport={handleExportBitrix}
        editCard={editCard}
        columns={columns.map(c => ({ id: c.id, title: c.title }))}
        users={users}
      />
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-base-content">Quadro Kanban</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {importResult && (
            <span className="text-xs text-base-content/60 bg-base-200 px-3 py-2 rounded-lg">
              ✓ {importResult.imported} importadas, {importResult.skipped} ignoradas
            </span>
          )}
          <button
            onClick={handleImportBitrix}
            disabled={importing}
            className="px-4 py-2 rounded-lg bg-base-200 text-base-content text-sm font-medium hover:bg-base-300 transition-colors disabled:opacity-50"
          >
            {importing ? 'Importando...' : '↓ Importar Bitrix24'}
          </button>
          <button
            onClick={() => { setEditCard(null); setModalOpen(true) }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-content text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + Novo Card
          </button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(column => (
            <KanbanColumn key={column.id} column={column} onEdit={(card) => { setEditCard(card); setModalOpen(true) }} />
          ))}
        </div>
        <DragOverlay>
          {activeCard && <KanbanCard card={activeCard} onEdit={() => {}} overlay />}
        </DragOverlay>
      </DndContext>
    </>
  )
}
