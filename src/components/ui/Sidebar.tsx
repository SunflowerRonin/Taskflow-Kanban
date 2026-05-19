'use client'

import { useAuth } from '../../hooks/useAuth'

const links = [
  {
    href: '/kanban',
    label: 'Kanban',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="18" rx="1" />
        <rect x="14" y="3" width="7" height="11" rx="1" />
        <rect x="14" y="18" width="7" height="3" rx="1" />
      </svg>
    ),
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const { logout, user } = useAuth()

  return (
    <aside style={{ backgroundColor: '#13131f', borderRight: '1px solid #1e1e30' }}
      className="w-60 min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b" style={{ borderColor: '#1e1e30' }}>
        <div className="flex items-center gap-2">
          <div style={{ backgroundColor: '#7c5cfc', borderRadius: '6px' }}
            className="w-7 h-7 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="font-semibold text-base" style={{ color: '#e2e2f0', letterSpacing: '-0.02em' }}>
            TaskFlow
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {links.map(link => (
          <a
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm"
            style={{ color: '#9999b3' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#1e1e30'
              e.currentTarget.style.color = '#e2e2f0'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#9999b3'
            }}
          >
            {link.icon}
            <span>{link.label}</span>
          </a>
        ))}
      </nav>

      <div className="px-3 py-4 border-t" style={{ borderColor: '#1e1e30' }}>
        {user && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            <div style={{ backgroundColor: '#7c5cfc', borderRadius: '50%' }}
              className="w-6 h-6 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-xs truncate" style={{ color: '#9999b3', fontFamily: 'JetBrains Mono, monospace' }}>
              {user.name}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
          style={{ color: '#9999b3' }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.1)'
            e.currentTarget.style.color = '#f87171'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#9999b3'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Sair
        </button>
      </div>
    </aside>
  )
}
