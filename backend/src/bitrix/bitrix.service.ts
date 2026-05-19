import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Task } from '../tasks/task.entity'

@Injectable()
export class BitrixService {
  private readonly logger = new Logger(BitrixService.name)
  private readonly webhookUrl: string
  private readonly webhookSecret: string

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {
    this.webhookUrl = this.config.get<string>('BITRIX_WEBHOOK_URL') || ''
    this.webhookSecret = this.config.get<string>('BITRIX_WEBHOOK_SECRET') || ''
  }

  // ---------- helpers internos ----------

  private async call(method: string, params: Record<string, any> = {}) {
    if (!this.webhookUrl) throw new Error('BITRIX_WEBHOOK_URL não configurada')
    const url = `${this.webhookUrl}/${method}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!res.ok) throw new Error(`Bitrix24 retornou ${res.status}`)
    const data = await res.json()
    if (data.error) throw new Error(data.error_description || data.error)
    return data.result
  }

  private readonly statusMap: Record<string, string> = {
    '1': 'todo',
    '2': 'in-progress',
    '3': 'in-progress',
    '4': 'review',
    '5': 'done',
  }

  private readonly priorityMap: Record<string, string> = {
    '0': 'baixa',
    '1': 'média',
    '2': 'alta',
  }

  private async findByBitrixId(bitrixId: string): Promise<Task | null> {
    return this.taskRepo
      .createQueryBuilder('task')
      .where('task.description LIKE :pattern', { pattern: `%[bitrix:${bitrixId}]%` })
      .getOne()
  }

  // ---------- import ----------

  async importTasks(): Promise<{ imported: number; skipped: number }> {
    const bitrixTasks = await this.call('tasks.task.list', {
      select: ['ID', 'TITLE', 'DESCRIPTION', 'PRIORITY', 'DEADLINE', 'STATUS', 'TAGS'],
      filter: { '!STATUS': 5 },
    })

    const tasks: any[] = bitrixTasks?.tasks || []
    let imported = 0
    let skipped = 0

    for (const bt of tasks) {
      const exists = await this.findByBitrixId(bt.id)

      if (exists) {
        skipped++
        continue
      }

      const count = await this.taskRepo.count({ where: { status: 'todo' as any } })
      const task = this.taskRepo.create({
        title: bt.title,
        description: `[bitrix:${bt.id}] ${bt.description || ''}`.trim(),
        status: (this.statusMap[bt.status] || 'todo') as any,
        priority: (this.priorityMap[bt.priority] || 'baixa') as any,
        dueDate: bt.deadline ? bt.deadline.split('T')[0] : null,
        tags: bt.tags || [],
        position: count,
        history: [],
        attachments: [],
      })

      await this.taskRepo.save(task)
      imported++
    }

    this.logger.log(`Import: ${imported} importadas, ${skipped} ignoradas`)
    return { imported, skipped }
  }

  // ---------- export ----------

  async exportTask(taskId: string): Promise<{ bitrixId: string }> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } })
    if (!task) throw new Error('Task não encontrada')

    const pMap: Record<string, number> = { baixa: 0, média: 1, alta: 2 }
    const sMap: Record<string, number> = {
      todo: 1,
      'in-progress': 2,
      review: 4,
      done: 5,
    }

    const result = await this.call('tasks.task.add', {
      fields: {
        TITLE: task.title,
        DESCRIPTION: task.description || '',
        PRIORITY: pMap[task.priority] ?? 0,
        STATUS: sMap[task.status] ?? 1,
        DEADLINE: task.dueDate ? `${task.dueDate}T23:59:59` : undefined,
        TAGS: task.tags || [],
      },
    })

    const bitrixId = String(result?.task?.id || result?.id || '')
    this.logger.log(`Task ${taskId} exportada → Bitrix ID ${bitrixId}`)
    return { bitrixId }
  }

  // ---------- webhook ----------

  validateSecret(secret: string): boolean {
    if (!this.webhookSecret) return true // se não configurado, aceita tudo (dev)
    return secret === this.webhookSecret
  }

  async receiveWebhook(body: any): Promise<{ ok: boolean; action?: string }> {
    const event = (body.event as string || '').toUpperCase()
    // O Bitrix24 pode mandar os dados em FIELDS_AFTER (update) ou FIELDS (add/delete)
    const fields = body.data?.FIELDS_AFTER || body.data?.FIELDS || body.data || {}
    const bitrixId = String(fields.ID || fields.id || '')

    this.logger.log(`Webhook recebido: ${event} | bitrixId: ${bitrixId || '?'}`)

    switch (event) {

      case 'ONTASKADD': {
        if (!bitrixId) return { ok: false }
        const alreadyExists = await this.findByBitrixId(bitrixId)
        if (alreadyExists) return { ok: true, action: 'already_exists' }

        // Busca os detalhes completos no Bitrix (o webhook só manda IDs)
        let bt: any = fields
        if (!bt.TITLE) {
          const detail = await this.call('tasks.task.get', { taskId: bitrixId }).catch(() => null)
          bt = detail?.task || fields
        }

        const count = await this.taskRepo.count({ where: { status: 'todo' as any } })
        const task = this.taskRepo.create({
          title: bt.TITLE || bt.title || `[Bitrix #${bitrixId}]`,
          description: `[bitrix:${bitrixId}] ${bt.DESCRIPTION || bt.description || ''}`.trim(),
          status: (this.statusMap[String(bt.STATUS || bt.status || '1')] || 'todo') as any,
          priority: (this.priorityMap[String(bt.PRIORITY || bt.priority || '0')] || 'baixa') as any,
          dueDate: (bt.DEADLINE || bt.deadline || '').split('T')[0] || null,
          tags: bt.TAGS || bt.tags || [],
          position: count,
          history: [],
          attachments: [],
        })
        await this.taskRepo.save(task)
        this.logger.log(`ONTASKADD → criada task local ${task.id}`)
        return { ok: true, action: 'created' }
      }

      case 'ONTASKUPDATE': {
        if (!bitrixId) return { ok: false }
        const existing = await this.findByBitrixId(bitrixId)
        if (!existing) return { ok: true, action: 'not_found' }

        let changed = false

        if (fields.TITLE && existing.title !== fields.TITLE) {
          existing.title = fields.TITLE
          changed = true
        }

        if (fields.DESCRIPTION !== undefined) {
          const clean = fields.DESCRIPTION || ''
          const prefix = `[bitrix:${bitrixId}]`
          existing.description = clean ? `${prefix} ${clean}` : prefix
          changed = true
        }

        if (fields.STATUS) {
          const newStatus = this.statusMap[String(fields.STATUS)]
          if (newStatus && existing.status !== newStatus) {
            existing.history = [
              ...(existing.history || []),
              { status: newStatus, changedAt: new Date(), changedBy: 'Bitrix24' },
            ]
            existing.status = newStatus as any
            changed = true
          }
        }

        if (fields.PRIORITY !== undefined) {
          const newPriority = this.priorityMap[String(fields.PRIORITY)]
          if (newPriority) { existing.priority = newPriority as any; changed = true }
        }

        if (fields.DEADLINE !== undefined) {
          existing.dueDate = fields.DEADLINE ? fields.DEADLINE.split('T')[0] : null
          changed = true
        }

        if (fields.TAGS !== undefined) {
          existing.tags = Array.isArray(fields.TAGS) ? fields.TAGS : []
          changed = true
        }

        if (changed) {
          await this.taskRepo.save(existing)
          this.logger.log(`ONTASKUPDATE → sincronizada task ${existing.id}`)
        }

        return { ok: true, action: changed ? 'updated' : 'no_changes' }
      }

      case 'ONTASKDELETE': {
        if (!bitrixId) return { ok: false }
        const toDelete = await this.findByBitrixId(bitrixId)
        if (!toDelete) return { ok: true, action: 'not_found' }
        await this.taskRepo.remove(toDelete)
        this.logger.log(`ONTASKDELETE → removida task ${toDelete.id}`)
        return { ok: true, action: 'deleted' }
      }

      default:
        this.logger.debug(`Evento ignorado: ${event}`)
        return { ok: true, action: 'ignored' }
    }
  }
}
