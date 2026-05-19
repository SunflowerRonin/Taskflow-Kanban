import { Injectable, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { User } from './user.entity'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(name: string, email: string, password: string): Promise<User> {
    const exists = await this.repo.findOne({ where: { email } })
    if (exists) throw new ConflictException('E-mail já cadastrado')
    const hash = await bcrypt.hash(password, 10)
    const user = this.repo.create({ name, email, password: hash })
    return this.repo.save(user)
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } })
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } })
  }

  async findAll(): Promise<User[]> {
    return this.repo.find({ select: ['id', 'name', 'email', 'createdAt'] })
  }
}