'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import styles from './login.module.css'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState<'signin'|'signup'>('signin')
  const [name, setName]         = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)
  const router = useRouter()
  const sb = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await sb.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        })
        if (error) throw error
        setSent(true)
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logo}><span className={styles.logoMark}>AQ</span><span className={styles.logoText}>AuditQens</span></div>
        <div className={styles.sentMsg}>
          <div className={styles.sentIcon}>✓</div>
          <h2>Check your email</h2>
          <p>We sent a confirmation link to <strong>{email}</strong></p>
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.bg} />
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>AQ</span>
          <div>
            <div className={styles.logoText}>AuditQens</div>
            <div className={styles.logoSub}>GL Knowledge Graph</div>
          </div>
        </div>

        <h1 className={styles.title}>{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
        <p className={styles.subtitle}>
          {mode === 'signin' ? 'Access your GL analytics dashboard' : 'Start exploring your GL data'}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === 'signup' && (
            <div className={styles.field}>
              <label>Full name</label>
              <input type="text" value={name} onChange={e=>setName(e.target.value)}
                placeholder="Jane Smith" required />
            </div>
          )}
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="you@company.com" required />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6} />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Loading…' : mode === 'signin' ? 'Sign in →' : 'Create account →'}
          </button>
        </form>

        <div className={styles.toggle}>
          {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setMode(m => m==='signin'?'signup':'signin'); setError('') }}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
