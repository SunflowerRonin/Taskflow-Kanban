import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { TasksController } from './tasks.controller'
import { TasksService } from './tasks.service'
import { Task } from './task.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    BullModule.registerQueue({ name: 'mail' }),
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}