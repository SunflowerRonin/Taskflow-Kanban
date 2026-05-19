import { api } from './api'

export type User = {
  id: string
  name: string
  email: string
}

export async function getUsers(): Promise<User[]> {
  return api.get<User[]>('/users')
}