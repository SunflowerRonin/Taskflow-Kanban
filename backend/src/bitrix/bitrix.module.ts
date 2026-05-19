import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { BitrixService } from './bitrix.service'
import { BitrixController } from './bitrix.controller'
import { Task } from '../tasks/task.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Task]), ConfigModule],
  controllers: [BitrixController],
  providers: [BitrixService],
})
export class BitrixModule {}