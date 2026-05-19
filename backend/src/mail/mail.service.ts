import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)

  constructor(private readonly config: ConfigService) {}

  async sendTaskAssigned(to: string, taskTitle: string) {
    this.logger.log(`[MOCK] E-mail de atribuição para ${to}: ${taskTitle}`)
  }

  async sendStatusChanged(to: string, taskTitle: string, newStatus: string) {
    this.logger.log(`[MOCK] E-mail de status para ${to}: ${taskTitle} → ${newStatus}`)
  }

  async sendDueDateReminder(to: string, taskTitle: string, dueDate: string) {
    this.logger.log(`[MOCK] Lembrete de prazo para ${to}: ${taskTitle} vence em ${dueDate}`)
  }
}