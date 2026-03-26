'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import styles from './UserMenu.module.css';

type Theme = 'dark' | 'sage' | 'arctic';

const THEMES: { id: Theme; label: string; swatch: string }[] = [
  { id: 'dark',   label: 'Dark',        swatch: '#09090f' },
  { id: 'sage',   label: 'Sage Mist',   swatch: '#d8f3e5' },
  { id: 'arctic', label: 'Arctic White', swatch: '#f1f5f9' },
];

interface UserMenuProps {
  email: string;
}

export default function UserMenu({ email }: UserMenuProps) {
  const [open, setOpen]           = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [theme, setTheme]         = useState<Theme>('dark');
  const menuRef                   = useRef<HTMLDivElement>(null);
  const router                    = useRouter();
  const supabase                  = createClient();

  /* ── Initialise theme from localStorage on mount ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aq-theme') as Theme | null;
      if (saved && (saved === 'sage' || saved === 'arctic')) {
        setTheme(saved);
      }
    } catch {}
  }, []);

  /* ── Close menu on outside click ── */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowTheme(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  /* ── Apply theme to <html> and persist ── */
  function applyTheme(t: Theme) {
    setTheme(t);
    try {
      if (t === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.removeItem('aq-theme');
      } else {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('aq-theme', t);
      }
    } catch {}
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const initials = email
    ? email.slice(0, 2).toUpperCase()
    : 'AQ';

  return (
    <div className={styles.wrapper} ref={menuRef}>
      {/* ── Avatar / trigger button ── */}
      <button
        className={styles.avatar}
        onClick={() => {
          setOpen(prev => !prev);
          if (open) setShowTheme(false);
        }}
        aria-label="User menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className={styles.dropdown}>
          {/* User info */}
          <div className={styles.userInfo}>
            <span className={styles.userEmail}>{email}</span>
          </div>

          <div className={styles.divider} />

          {/* Appearance toggle */}
          <button
            className={styles.menuItem}
            onClick={() => setShowTheme(prev => !prev)}
          >
            <span className={styles.menuIcon}>🎨</span>
            Appearance
            <span className={`${styles.chevron} ${showTheme ? styles.chevronOpen : ''}`}>
              ›
            </span>
          </button>

          {/* Theme picker — conditionally rendered, NO display:none needed */}
          {showTheme && (
            <div className={styles.themeSection}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  className={`${styles.themeSwatch} ${theme === t.id ? styles.themeActive : ''}`}
                  onClick={() => applyTheme(t.id)}
                >
                  <span
                    className={styles.swatchDot}
                    style={{ background: t.swatch }}
                  />
                  {t.label}
                  {theme === t.id && <span className={styles.checkmark}>✓</span>}
                </button>
              ))}
            </div>
          )}

          <div className={styles.divider} />

          {/* Sign out */}
          <button className={styles.menuItem} onClick={handleSignOut}>
            <span className={styles.menuIcon}>↩</span>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
