import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { UsersService } from '../users/users.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(name: string, email: string, password: string) {
    const user = await this.usersService.create(name, email, password)
    const token = this.jwtService.sign({ sub: user.id, email: user.email })
    return { token, user: { id: user.id, name: user.name, email: user.email } }
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email)
    if (!user) throw new UnauthorizedException('Credenciais inválidas')
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new UnauthorizedException('Credenciais inválidas')
    const token = this.jwtService.sign({ sub: user.id, email: user.email })
    return { token, user: { id: user.id, name: user.name, email: user.email } }
  }
}