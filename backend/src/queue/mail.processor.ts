import { Processor, Process } from '@nestjs/bull'
import { Job } from 'bull'
import { Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MailService } from '../mail/mail.service'
import { Task } from '../tasks/task.entity'
import { User } from '../users/user.entity'

@Processor('mail')
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name)

  constructor(
    private readonly mailService: MailService,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  @Process('task-assigned')
  async handleTaskAssigned(job: Job<{ taskId: string; assigneeId: string }>) {
    const { taskId, assigneeId } = job.data
    const task = await this.taskRepo.findOne({ where: { id: taskId } })
    const user = await this.userRepo.findOne({ where: { id: assigneeId } })
    if (!task || !user) return
    this.logger.log(`Enviando e-mail de atribuição para ${user.email}`)
    await this.mailService.sendTaskAssigned(user.email, task.title)
  }

  @Process('status-changed')
  async handleStatusChanged(job: Job<{ taskId: string; newStatus: string; assigneeId: string }>) {
    const { taskId, newStatus, assigneeId } = job.data
    const task = await this.taskRepo.findOne({ where: { id: taskId } })
    const user = await this.userRepo.findOne({ where: { id: assigneeId } })
    if (!task || !user) return
    this.logger.log(`Enviando e-mail de status para ${user.email}`)
    await this.mailService.sendStatusChanged(user.email, task.title, newStatus)
  }

  @Process('due-date-reminder')
  async handleDueDateReminder(job: Job<{ taskId: string; assigneeId: string }>) {
    const { taskId, assigneeId } = job.data
    const task = await this.taskRepo.findOne({ where: { id: taskId } })
    const user = await this.userRepo.findOne({ where: { id: assigneeId } })
    if (!task || !user) return
    this.logger.log(`Enviando lembrete de prazo para ${user.email}`)
    await this.mailService.sendDueDateReminder(user.email, task.title, task.dueDate)
  }
}