import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MailProcessor } from './mail.processor'
import { DueDateScheduler } from './due-date.scheduler'
import { MailModule } from '../mail/mail.module'
import { Task } from '../tasks/task.entity'
import { User } from '../users/user.entity'

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
        },
      }),
    }),
    BullModule.registerQueue({ name: 'mail' }),
    TypeOrmModule.forFeature([Task, User]),
    MailModule,
  ],
  providers: [MailProcessor, DueDateScheduler],
  exports: [BullModule],
})
export class QueueModule {}