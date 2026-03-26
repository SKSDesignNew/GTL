'use client'
import { useState, useRef, useEffect } from 'react'
import styles from './UserMenu.module.css'

interface Props {
  name: string
  email: string
  onSignOut: () => void
}

type Theme = 'dark' | 'sage' | 'arctic'

const THEMES: { id: Theme; label: string; bg: string; accent: string }[] = [
  { id: 'dark',   label: 'Dark',         bg: '#0f1117', accent: '#3b82f6' },
  { id: 'sage',   label: 'Sage Mist',    bg: '#f0fdf4', accent: '#16a34a' },
  { id: 'arctic', label: 'Arctic White', bg: '#f8fafc', accent: '#2563eb' },
]

function getActiveTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const t = localStorage.getItem('aq-theme')
  if (t === 'sage' || t === 'arctic') return t
  return 'dark'
}

function applyTheme(theme: Theme) {
  try {
    if (theme === 'dark') {
      document.documentElement.removeAttribute('data-theme')
      localStorage.removeItem('aq-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('aq-theme', theme)
    }
  } catch(e) {}
}

export default function UserMenu({ name, email, onSignOut }: Props) {
  const [open,    setOpen]    = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [theme,   setTheme]   = useState<Theme>('dark')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTheme(getActiveTheme())
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setConfirm(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleTheme(t: Theme) {
    setTheme(t)
    applyTheme(t)
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button className={styles.trigger} onClick={() => { setOpen(o => !o); setConfirm(false) }}>
        <div className={styles.avatar}>{name[0].toUpperCase()}</div>
        <div className={styles.info}>
          <div className={styles.name}>{name}</div>
        </div>
        <span className={styles.chevron} style={{ transform: open ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropHeader}>
            <div className={styles.dropAvatar}>{name[0].toUpperCase()}</div>
            <div>
              <div className={styles.dropName}>{name}</div>
              <div className={styles.dropEmail}>{email}</div>
            </div>
          </div>
          <div className={styles.dropDivider} />

          {/* Theme switcher */}
          <div className={styles.themeSection}>
            <div className={styles.themeLabel}>Theme</div>
            <div className={styles.themeOptions}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  className={`${styles.themeBtn} ${theme === t.id ? styles.themeBtnActive : ''}`}
                  onClick={() => handleTheme(t.id)}
                  title={t.label}
                >
                  <span className={styles.themeSwatch} style={{ background: t.bg, borderColor: t.accent }}>
                    <span className={styles.themeSwatchDot} style={{ background: t.accent }} />
                  </span>
                  <span className={styles.themeBtnLabel}>{t.label}</span>
                  {theme === t.id && <span className={styles.themeCheck}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.dropDivider} />
          <div className={styles.dropItem} onClick={() => {}}>
            <span>⚙</span> Settings
          </div>
          <div className={styles.dropItem} onClick={() => {}}>
            <span>?</span> Help
          </div>
          <div className={styles.dropDivider} />
          {!confirm ? (
            <div className={`${styles.dropItem} ${styles.dropDanger}`} onClick={() => setConfirm(true)}>
              <span>→</span> Sign out
            </div>
          ) : (
            <div className={styles.confirmWrap}>
              <div className={styles.confirmText}>Sign out of AuditQens?</div>
              <div className={styles.confirmBtns}>
                <button className={styles.confirmCancel} onClick={() => setConfirm(false)}>Cancel</button>
                <button className={styles.confirmOk} onClick={onSignOut}>Sign out</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
