import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { Task, Status, Priority, Attachment } from './task.entity'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly repo: Repository<Task>,
    @InjectQueue('mail')
    private readonly mailQueue: Queue,
  ) {}

  async create(data: {
    title: string
    description?: string
    priority?: Priority
    dueDate?: string
    tags?: string[]
    assigneeId?: string
    status?: Status
  }): Promise<Task> {
    const status = data.status || 'todo'
    const count = await this.repo.count({ where: { status } })
    const task = this.repo.create({ ...data, status, position: count, history: [], attachments: [] })
    const saved = await this.repo.save(task)

    if (saved.assigneeId) {
      await this.mailQueue.add('task-assigned', {
        taskId: saved.id,
        assigneeId: saved.assigneeId,
      })
    }

    return saved
  }

  async findAll(): Promise<Task[]> {
    return this.repo.find({ order: { status: 'ASC', position: 'ASC' } })
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.repo.findOne({ where: { id } })
    if (!task) throw new NotFoundException('Task não encontrada')
    return task
  }

  async update(id: string, data: Partial<Task> & { position?: number }, changedBy?: string): Promise<Task> {
    const task = await this.findOne(id)

    const statusChanged = data.status && data.status !== task.status
    if (statusChanged) {
      const historyEntry = {
        status: data.status!,
        changedAt: new Date(),
        changedBy,
      }
      task.history = [...(task.history || []), historyEntry]
    }

    const assigneeChanged = data.assigneeId && data.assigneeId !== task.assigneeId

    Object.assign(task, data)
    const saved = await this.repo.save(task)

    if (statusChanged && saved.assigneeId) {
      await this.mailQueue.add('status-changed', {
        taskId: saved.id,
        newStatus: saved.status,
        assigneeId: saved.assigneeId,
      })
    }

    if (assigneeChanged && saved.assigneeId) {
      await this.mailQueue.add('task-assigned', {
        taskId: saved.id,
        assigneeId: saved.assigneeId,
      })
    }

    return saved
  }

  async addAttachment(id: string, attachment: Attachment): Promise<Task> {
    const task = await this.findOne(id)
    task.attachments = [...(task.attachments || []), attachment]
    return this.repo.save(task)
  }

  async removeAttachment(id: string, filename: string): Promise<Task> {
    const task = await this.findOne(id)

    task.attachments = (task.attachments || []).filter(a => !a.url.includes(filename))

    const filePath = path.join('./uploads', filename)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    return this.repo.save(task)
  }

  async reorder(ids: string[]): Promise<void> {
    const updates = ids.map((id, index) => this.repo.update(id, { position: index }))
    await Promise.all(updates)
  }

  async remove(id: string): Promise<void> {
    const task = await this.findOne(id)
    await this.repo.remove(task)
  }

  async findOverdue(): Promise<Task[]> {
    const today = new Date().toISOString().split('T')[0]
    return this.repo
      .createQueryBuilder('task')
      .where('task.dueDate < :today', { today })
      .andWhere('task.status != :done', { done: 'done' })
      .getMany()
  }
}
