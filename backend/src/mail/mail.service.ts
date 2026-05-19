import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private transporter: nodemailer.Transporter

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('MAIL_HOST'),
      port: this.config.get<number>('MAIL_PORT'),
      auth: {
        user: this.config.get<string>('MAIL_USER'),
        pass: this.config.get<string>('MAIL_PASS'),
      },
    })
  }

  async sendTaskAssigned(to: string, taskTitle: string) {
    this.logger.log(`Enviando e-mail de atribuição para ${to}: ${taskTitle}`)
    await this.transporter.sendMail({
      from: '"TaskFlow" <noreply@taskflow.app>',
      to,
      subject: `Você foi atribuído à tarefa: ${taskTitle}`,
      text: `Olá! A tarefa "${taskTitle}" foi atribuída a você no TaskFlow.`,
      html: `<p>Olá!</p><p>A tarefa <strong>${taskTitle}</strong> foi atribuída a você no TaskFlow.</p>`,
    })
  }

  async sendStatusChanged(to: string, taskTitle: string, newStatus: string) {
    this.logger.log(`Enviando e-mail de status para ${to}: ${taskTitle} → ${newStatus}`)
    await this.transporter.sendMail({
      from: '"TaskFlow" <noreply@taskflow.app>',
      to,
      subject: `Status atualizado: ${taskTitle}`,
      text: `O status da tarefa "${taskTitle}" foi alterado para "${newStatus}".`,
      html: `<p>O status da tarefa <strong>${taskTitle}</strong> foi alterado para <strong>${newStatus}</strong>.</p>`,
    })
  }

  async sendDueDateReminder(to: string, taskTitle: string, dueDate: string) {
    this.logger.log(`Enviando lembrete de prazo para ${to}: ${taskTitle} vence em ${dueDate}`)
    await this.transporter.sendMail({
      from: '"TaskFlow" <noreply@taskflow.app>',
      to,
      subject: `Lembrete de prazo: ${taskTitle}`,
      text: `A tarefa "${taskTitle}" vence em ${dueDate}. Não esqueça de finalizá-la!`,
      html: `<p>A tarefa <strong>${taskTitle}</strong> vence em <strong>${dueDate}</strong>. Não esqueça de finalizá-la!</p>`,
    })
  }
}
