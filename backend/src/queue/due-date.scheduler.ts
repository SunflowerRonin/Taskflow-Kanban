import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between } from 'typeorm'
import { Task } from '../tasks/task.entity'

@Injectable()
export class DueDateScheduler {
  private readonly logger = new Logger(DueDateScheduler.name)

  constructor(
    @InjectQueue('mail') private readonly mailQueue: Queue,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkDueDates() {
    const today = new Date()
    const twoDaysFromNow = new Date()
    twoDaysFromNow.setDate(today.getDate() + 2)

    const todayStr = today.toISOString().split('T')[0]
    const futureStr = twoDaysFromNow.toISOString().split('T')[0]

    const tasks = await this.taskRepo.find({
      where: {
        dueDate: Between(todayStr, futureStr) as any,
        status: 'todo' as any,
      },
    })

    this.logger.log(`Verificando prazos próximos: ${tasks.length} tarefa(s) encontrada(s)`)

    for (const task of tasks) {
      if (!task.assigneeId) continue
      await this.mailQueue.add('due-date-reminder', {
        taskId: task.id,
        assigneeId: task.assigneeId,
      })
    }
  }
}