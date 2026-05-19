import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from '../users/user.entity'

export type Priority = 'baixa' | 'média' | 'alta'
export type Status = 'todo' | 'in-progress' | 'review' | 'done'

export type Attachment = {
  name: string
  url: string
  size: number
  uploadedAt: string
}

@Entity()
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @Column({ nullable: true })
  description: string

  @Column({ default: 'todo' })
  status: Status

  @Column({ default: 'baixa' })
  priority: Priority

  @Column({ nullable: true })
  dueDate: string

  @Column('simple-array', { nullable: true })
  tags: string[]

  @ManyToOne(() => User, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeId' })
  assignee: User

  @Column({ nullable: true })
  assigneeId: string

  @Column({ default: 0 })
  position: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column('jsonb', { default: [] })
  history: { status: string; changedAt: Date; changedBy?: string }[]

  @Column('jsonb', { default: [] })
  attachments: Attachment[]
}