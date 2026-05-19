'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts'
import { getTasks } from '../../../services/tasks'
import type { Card } from '../../../types/kanban'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444']

const STATUS_LABELS: Record<string, string> = {
  'todo': 'A Fazer',
  'in-progress': 'Em Andamento',
  'review': 'Em Revisão',
  'done': 'Concluído',
}

function getWeekKey(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  return start.toISOString().split('T')[0]
}

function exportCSV(tasks: Card[]) {
  const headers = ['ID', 'Título', 'Descrição', 'Status', 'Prioridade', 'Responsável', 'Data de Entrega', 'Tags']
  const rows = tasks.map(t => [
    t.id,
    `"${t.title.replace(/"/g, '""')}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    STATUS_LABELS[t.status] || t.status,
    t.priority,
    t.assignee || '',
    t.dueDate || '',
    `"${(t.tags || []).join(', ')}"`,
  ])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `taskflow-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  useEffect(() => {
    getTasks().then(data => {
      setTasks(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtradas = tasks.filter(t => {
    if (!t.dueDate) return true
    if (dataInicio && t.dueDate < dataInicio) return false
    if (dataFim && t.dueDate > dataFim) return false
    return true
  })

  const cardsPorStatus = ['todo', 'in-progress', 'review', 'done'].map(status => ({
    status: STATUS_LABELS[status],
    total: filtradas.filter(t => t.status === status).length,
  }))

  const responsavelMap: Record<string, number> = {}
  filtradas.forEach(t => {
    if (t.assignee) responsavelMap[t.assignee] = (responsavelMap[t.assignee] || 0) + 1
  })
  const cardsPorResponsavel = Object.entries(responsavelMap).map(([nome, total]) => ({ nome, total }))

  const hoje = new Date().toISOString().split('T')[0]
  const atrasadas = filtradas.filter(t => t.dueDate && t.dueDate < hoje && t.status !== 'done')

  const semanaMap: Record<string, number> = {}
  filtradas.filter(t => t.status === 'done' && t.dueDate).forEach(t => {
    const key = getWeekKey(new Date(t.dueDate))
    semanaMap[key] = (semanaMap[key] || 0) + 1
  })
  const fluxoConclusao = Object.entries(semanaMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semana, concluidas]) => ({ semana, concluidas }))

  const limparFiltros = () => { setDataInicio(''); setDataFim('') }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-base-content">Dashboard</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-base-200 rounded-lg px-3 py-2">
            <span className="text-xs text-base-content/60">De</span>
            <input
              type="date"
              className="bg-transparent text-sm text-base-content outline-none"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
            />
            <span className="text-xs text-base-content/60">até</span>
            <input
              type="date"
              className="bg-transparent text-sm text-base-content outline-none"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
            />
          </div>
          {(dataInicio || dataFim) && (
            <button onClick={limparFiltros} className="px-3 py-2 rounded-lg bg-base-200 text-sm text-base-content/60 hover:bg-base-300">
              Limpar
            </button>
          )}
          <button
            onClick={() => exportCSV(filtradas)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-content text-sm font-medium hover:opacity-90 transition-opacity"
          >
            ↓ Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cardsPorStatus.map((item, i) => (
          <div key={item.status} className="bg-base-200 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-base-content/60">{item.status}</span>
            <span className="text-3xl font-bold text-base-content">{item.total}</span>
            <div className="w-full h-1 rounded-full mt-1" style={{ backgroundColor: COLORS[i] }} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-base-200 rounded-xl p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-base-content">Cards por Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cardsPorStatus}>
              <XAxis dataKey="status" tick={{ fontSize: 11, fill: 'var(--color-base-content)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-base-content)' }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-base-100)', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {cardsPorStatus.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-base-200 rounded-xl p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-base-content">Distribuição por Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={cardsPorStatus} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={80}
                label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}>
                {cardsPorStatus.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-base-100)', border: 'none', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-base-200 rounded-xl p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-base-content">Tarefas por Responsável</h2>
          {cardsPorResponsavel.length === 0 ? (
            <p className="text-sm text-base-content/50">Nenhuma tarefa com responsável.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cardsPorResponsavel} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-base-content)' }} />
                <YAxis dataKey="nome" type="category" tick={{ fontSize: 11, fill: 'var(--color-base-content)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-base-100)', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="total" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-base-200 rounded-xl p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-base-content">Fluxo de Conclusão</h2>
          {fluxoConclusao.length === 0 ? (
            <p className="text-sm text-base-content/50">Nenhuma tarefa concluída ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={fluxoConclusao}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" />
                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: 'var(--color-base-content)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-base-content)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-base-100)', border: 'none', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="concluidas" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-base-200 rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base-content">Tarefas Atrasadas</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-error/10 text-error font-medium">{atrasadas.length} tarefas</span>
        </div>
        {atrasadas.length === 0 ? (
          <p className="text-sm text-base-content/50">Nenhuma tarefa atrasada.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {atrasadas.map(t => {
              const dias = Math.floor((new Date().getTime() - new Date(t.dueDate).getTime()) / 86400000)
              return (
                <div key={t.id} className="flex items-center justify-between bg-base-100 rounded-lg px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-base-content">{t.title}</span>
                    <span className="text-xs text-base-content/60">{t.assignee || 'Sem responsável'} · prazo: {t.dueDate}</span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-error/10 text-error font-medium">{dias}d atraso</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}