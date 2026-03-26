'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import styles from './ChatPanel.module.css'
import type { NodeId } from './nodeData'

interface Message {
  role: 'user' | 'assistant'
  content: string
  node_refs?: string[]
  data_rows?: Record<string, unknown>[]
  loading?: boolean
}

interface Props {
  onClose: () => void
  onNodeHighlight: (nodes: NodeId[]) => void
  onNavigate: (view: string) => void
}

const SUGGESTIONS = [
  'What was the net cash flow in Q3 2025?',
  'Who are the top 5 clients by revenue?',
  'How many unmatched transactions are there?',
  'Show me payments by method',
  'What is the closing balance for Cash accounts?',
  'Which GL rule fires the most?',
  'Compare receipts vs payments by month',
  'What are the top suppliers by spend?',
]

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? '✓' : '✗'
  const s = String(v)
  if (s.length > 36) return s.slice(0, 36) + '…'
  return s
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  // Parse markdown-style bold and line breaks
  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g)
      return (
        <p key={i} style={{ margin: '2px 0' }}>
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j}>{part.slice(2, -2)}</strong>
              : part
          )}
        </p>
      )
    })
  }

  if (msg.loading) return (
    <div className={styles.msgAssistant}>
      <div className={styles.msgAvatar}>AQ</div>
      <div className={styles.msgBubble}>
        <div className={styles.typingDots}><span/><span/><span/></div>
      </div>
    </div>
  )

  const cols = msg.data_rows?.[0] ? Object.keys(msg.data_rows[0]) : []

  return (
    <div className={isUser ? styles.msgUser : styles.msgAssistant}>
      {!isUser && <div className={styles.msgAvatar}>AQ</div>}
      <div className={isUser ? styles.msgBubbleUser : styles.msgBubble}>
        <div className={styles.msgContent}>{renderContent(msg.content)}</div>
        {msg.node_refs && msg.node_refs.length > 0 && (
          <div className={styles.nodeRefRow}>
            {msg.node_refs.map(n => (
              <span key={n} className={styles.nodeRef}>{n}</span>
            ))}
          </div>
        )}
        {msg.data_rows && msg.data_rows.length > 0 && cols.length > 0 && (
          <div className={styles.dataTableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>{cols.map(c => <th key={c}>{c.replace(/_/g,' ')}</th>)}</tr>
              </thead>
              <tbody>
                {msg.data_rows.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    {cols.map(c => <td key={c}>{fmtVal(row[c])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {msg.data_rows.length > 20 && (
              <div className={styles.rowsMore}>+{msg.data_rows.length - 20} more rows</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPanel({ onClose, onNodeHighlight, onNavigate }: Props) {
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const sb = createClient()

  // Create session on mount
  useEffect(() => {
    async function init() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb.from('chat_sessions')
        .insert({ user_id: user.id, title: 'New conversation' })
        .select('session_id').single()
      if (data) setSessionId(data.session_id)
    }
    init()
    // Load welcome
    setMessages([{
      role: 'assistant',
      content: `Hello! I'm the AuditQens AI analyst.\n\nI have full access to your GL data — 500,000 transactions, 2,844 clients, 817 suppliers, and 12 months of FY 2025. Ask me anything about your financials.`,
    }])
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (text?: string) => {
    const userText = (text || input).trim()
    if (!userText || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: userText }
    const loadingMsg: Message = { role: 'assistant', content: '', loading: true }
    setMessages(prev => [...prev, userMsg, loadingMsg])
    setLoading(true)

    try {
      const { data: { session } } = await sb.auth.getSession()
      const token = session?.access_token

      const history = messages
        .filter(m => !m.loading)
        .map(m => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: userText })

      const res = await fetch(
        `https://dlnsqmcrtpfytpisuham.supabase.co/functions/v1/auditqens-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ messages: history, session_id: sessionId }),
        }
      )

      const data = await res.json()
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.content || 'Sorry, I could not get a response.',
        node_refs: data.node_refs || [],
        data_rows: data.data_rows || [],
      }

      setMessages(prev => [...prev.slice(0, -1), assistantMsg])

      // Highlight nodes on graph
      if (data.node_refs?.length) {
        onNodeHighlight(data.node_refs as NodeId[])
      }

      // Handle navigation actions
      const navMatch = data.content?.match(/"action"\s*:\s*"navigate"[^}]*"view"\s*:\s*"([^"]+)"/)
      if (navMatch) onNavigate(navMatch[1])

    } catch (err) {
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: 'Sorry, there was an error connecting to the AI. Please try again.',
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, messages, sessionId])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const showSuggestions = messages.length <= 1

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.avatar}>AQ</div>
          <div>
            <div className={styles.title}>AuditQens AI</div>
            <div className={styles.subtitle}>GL data analyst · FY 2025</div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} title="New chat" onClick={() => {
            setMessages([{ role:'assistant', content:'New conversation started. What would you like to know?' }])
          }}>✦</button>
          <button className={styles.iconBtn} onClick={onClose} title="Close">✕</button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

        {/* Suggestions */}
        {showSuggestions && (
          <div className={styles.suggestions}>
            <div className={styles.suggestTitle}>Try asking…</div>
            <div className={styles.suggestGrid}>
              {SUGGESTIONS.slice(0, 6).map(s => (
                <button key={s} className={styles.suggestBtn} onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <textarea
          ref={inputRef}
          className={styles.input}
          placeholder="Ask about your GL data…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
        />
        <button
          className={styles.sendBtn}
          onClick={() => send()}
          disabled={!input.trim() || loading}
        >
          {loading ? <span className={styles.sendSpinner} /> : '↑'}
        </button>
      </div>
      <div className={styles.inputHint}>Enter to send · Shift+Enter for new line</div>
    </div>
  )
}
