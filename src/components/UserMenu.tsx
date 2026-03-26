'use client'
import { useState, useRef, useEffect } from 'react'
import styles from './UserMenu.module.css'

interface Props {
  name: string
  email: string
  onSignOut: () => void
}

type Theme = 'dark' | 'sage' | 'arctic'

const THEMES: { id: Theme; label: string; bg: string; dot: string }[] = [
  { id: 'dark',   label: 'Dark',         bg: '#09090f', dot: '#3b82f6' },
  { id: 'sage',   label: 'Sage Mist',    bg: '#f0fdf4', dot: '#16a34a' },
  { id: 'arctic', label: 'Arctic White', bg: '#f8fafc', dot: '#2563eb' },
]

function getTheme(): Theme {
  try { return (localStorage.getItem('aq-theme') as Theme) || 'dark' } catch { return 'dark' }
}

function setTheme(t: Theme) {
  try { localStorage.setItem('aq-theme', t) } catch {}
  if (t === 'dark') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', t)
  }
}

export default function UserMenu({ name, email, onSignOut }: Props) {
  const [open,    setOpen]    = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [theme,   setThemeState] = useState<Theme>('dark')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setThemeState(getTheme())
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
    setThemeState(t)
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
                  <span className={styles.themeSwatch} style={{ background: t.bg, border: t.id === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                    <span className={styles.themeSwatchDot} style={{ background: t.dot }} />
                  </span>
                  <span className={styles.themeBtnLabel}>{t.label}</span>
                  {theme === t.id && <span className={styles.themeCheck}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.dropDivider} />
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
