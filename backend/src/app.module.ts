import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { TasksModule } from './tasks/tasks.module'
import { MailModule } from './mail/mail.module'
import { BitrixModule } from './bitrix/bitrix.module'
import { AppController } from './app.controller'
import { User } from './users/user.entity'
import { Task } from './tasks/task.entity'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    BitrixModule,
  ],
  controllers: [AppController],
})
export class AppModule {}