import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'
import { Task } from '../tasks/task.entity'

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ unique: true })
  email: string

  @Column()
  password: string

  @CreateDateColumn()
  createdAt: Date
}