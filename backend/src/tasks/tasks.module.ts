import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TasksController } from './tasks.controller'
import { TasksService } from './tasks.service'
import { Task } from './task.entity'
import { QueueModule } from '../queue/queue.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    QueueModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
