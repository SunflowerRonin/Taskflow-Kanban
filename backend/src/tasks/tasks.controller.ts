import {
  Controller, Get, Post, Put, Delete, Body, Param,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { IsString, IsOptional, IsArray } from 'class-validator'
import { TasksService } from './tasks.service'
import { Priority, Status } from './task.entity'
import * as fs from 'fs'

class CreateTaskDto {
  @IsString()
  title: string

  @IsOptional() @IsString()
  description?: string

  @IsOptional()
  priority?: Priority

  @IsOptional() @IsString()
  dueDate?: string

  @IsOptional() @IsArray()
  tags?: string[]

  @IsOptional() @IsString()
  assigneeId?: string

  @IsOptional()
  status?: Status
}

class UpdateTaskDto {
  @IsOptional() @IsString()
  title?: string

  @IsOptional() @IsString()
  description?: string

  @IsOptional()
  priority?: Priority

  @IsOptional() @IsString()
  dueDate?: string

  @IsOptional() @IsArray()
  tags?: string[]

  @IsOptional() @IsString()
  assigneeId?: string

  @IsOptional()
  status?: Status
}

const storage = diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads'
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${extname(file.originalname)}`)
  },
})

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto)
  }

  @Get()
  findAll() {
    return this.tasksService.findAll()
  }

  @Get('overdue')
  findOverdue() {
    return this.tasksService.findOverdue()
  }

  @Put('reorder/batch')
  reorder(@Body() dto: { ids: string[] }) {
    return this.tasksService.reorder(dto.ids)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id)
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', { storage, limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadAttachment(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado')
    return this.tasksService.addAttachment(id, {
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    })
  }

  @Delete(':id/attachments/:filename')
  removeAttachment(@Param('id') id: string, @Param('filename') filename: string) {
    return this.tasksService.removeAttachment(id, filename)
  }
}