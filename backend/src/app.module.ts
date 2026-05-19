import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { TasksModule } from './tasks/tasks.module'
import { MailModule } from './mail/mail.module'
import { QueueModule } from './queue/queue.module'
import { BitrixModule } from './bitrix/bitrix.module'
import { AppController } from './app.controller'
import { User } from './users/user.entity'
import { Task } from './tasks/task.entity'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        entities: [User, Task],
        synchronize: true,
      }),
    }),
    AuthModule,
    UsersModule,
    TasksModule,
    MailModule,
    QueueModule,
    BitrixModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
