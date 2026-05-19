'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'

type Errors = { email?: string; password?: string }

function validate(email: string, password: string): Errors {
  const errs: Errors = {}
  if (!email) errs.email = 'E-mail obrigatório'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'E-mail inválido'
  if (!password) errs.password = 'Senha obrigatória'
  else if (password.length < 6) errs.password = 'Mínimo 6 caracteres'
  return errs
}

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) router.push('/kanban')
  }, [router])

  async function handleSubmit() {
    const errs = validate(email, password)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setLoading(true)
    setServerError('')
    try {
      await login(email, password)
    } catch (error: unknown) {
      const message =
          error instanceof Error ? error.message : 'E-mail ou senha incorretos'

      setServerError(message)
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = (err?: string) =>
    `input input-bordered w-full ${err ? 'input-error' : ''}`

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card bg-base-100 w-full max-w-sm shadow-xl">
        <div className="card-body gap-4">
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-primary">TaskFlow</h1>
            <p className="text-base-content/60 text-sm mt-1">Entre na sua conta</p>
          </div>

          {serverError && (
            <div className="text-sm text-error bg-error/10 rounded-lg px-3 py-2">{serverError}</div>
          )}

          <div className="form-control gap-1">
            <label className="label"><span className="label-text">E-mail</span></label>
            <input
              type="email"
              placeholder="seu@email.com"
              className={fieldClass(errors.email)}
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined })) }}
            />
            {errors.email && <span className="text-xs text-error mt-0.5">{errors.email}</span>}
          </div>

          <div className="form-control gap-1">
            <label className="label"><span className="label-text">Senha</span></label>
            <input
              type="password"
              placeholder="••••••••"
              className={fieldClass(errors.password)}
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: undefined })) }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            {errors.password && <span className="text-xs text-error mt-0.5">{errors.password}</span>}
          </div>

          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary w-full mt-2">
            {loading ? <span className="loading loading-spinner loading-sm" /> : 'Entrar'}
          </button>

          <p className="text-center text-sm text-base-content/60">
            Não tem conta?{' '}
            <a href="/register" className="text-primary hover:underline">Cadastre-se</a>
          </p>
        </div>
      </div>
    </div>
  )
}
