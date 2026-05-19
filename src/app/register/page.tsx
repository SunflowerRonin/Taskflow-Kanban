'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'

type Errors = { name?: string; email?: string; password?: string; confirm?: string }

function validate(name: string, email: string, password: string, confirm: string): Errors {
  const errs: Errors = {}
  if (!name.trim()) errs.name = 'Nome obrigatório'
  if (!email) errs.email = 'E-mail obrigatório'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'E-mail inválido'
  if (!password) errs.password = 'Senha obrigatória'
  else if (password.length < 6) errs.password = 'Mínimo 6 caracteres'
  if (!confirm) errs.confirm = 'Confirme a senha'
  else if (confirm !== password) errs.confirm = 'Senhas não conferem'
  return errs
}

export default function RegisterPage() {
  const { register } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) router.push('/kanban')
  }, [router])

  async function handleSubmit() {
    const errs = validate(name, email, password, confirm)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setLoading(true)
    setServerError('')
    try {
      await register(name, email, password)
    } catch (e: any) {
      setServerError(e.message || 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  const clear = (field: keyof Errors) => setErrors(prev => ({ ...prev, [field]: undefined }))
  const fieldClass = (err?: string) => `input input-bordered w-full ${err ? 'input-error' : ''}`

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card bg-base-100 w-full max-w-sm shadow-xl">
        <div className="card-body gap-4">
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-primary">TaskFlow</h1>
            <p className="text-base-content/60 text-sm mt-1">Crie sua conta</p>
          </div>

          {serverError && (
            <div className="text-sm text-error bg-error/10 rounded-lg px-3 py-2">{serverError}</div>
          )}

          <div className="form-control gap-1">
            <label className="label"><span className="label-text">Nome</span></label>
            <input
              type="text"
              placeholder="Seu nome"
              className={fieldClass(errors.name)}
              value={name}
              onChange={e => { setName(e.target.value); clear('name') }}
            />
            {errors.name && <span className="text-xs text-error mt-0.5">{errors.name}</span>}
          </div>

          <div className="form-control gap-1">
            <label className="label"><span className="label-text">E-mail</span></label>
            <input
              type="email"
              placeholder="seu@email.com"
              className={fieldClass(errors.email)}
              value={email}
              onChange={e => { setEmail(e.target.value); clear('email') }}
            />
            {errors.email && <span className="text-xs text-error mt-0.5">{errors.email}</span>}
          </div>

          <div className="form-control gap-1">
            <label className="label"><span className="label-text">Senha</span></label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              className={fieldClass(errors.password)}
              value={password}
              onChange={e => { setPassword(e.target.value); clear('password') }}
            />
            {errors.password && <span className="text-xs text-error mt-0.5">{errors.password}</span>}
          </div>

          <div className="form-control gap-1">
            <label className="label"><span className="label-text">Confirmar senha</span></label>
            <input
              type="password"
              placeholder="••••••••"
              className={fieldClass(errors.confirm)}
              value={confirm}
              onChange={e => { setConfirm(e.target.value); clear('confirm') }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            {errors.confirm && <span className="text-xs text-error mt-0.5">{errors.confirm}</span>}
          </div>

          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary w-full mt-2">
            {loading ? <span className="loading loading-spinner loading-sm" /> : 'Cadastrar'}
          </button>

          <p className="text-center text-sm text-base-content/60">
            Já tem conta?{' '}
            <a href="/login" className="text-primary hover:underline">Entrar</a>
          </p>
        </div>
      </div>
    </div>
  )
}
