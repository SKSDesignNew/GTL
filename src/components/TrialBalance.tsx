'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import styles from './TrialBalance.module.css'

const PERIODS = [
  { code:'2025-01', name:'January 2025' },
  { code:'2025-02', name:'February 2025' },
  { code:'2025-03', name:'March 2025' },
  { code:'2025-04', name:'April 2025' },
  { code:'2025-05', name:'May 2025' },
  { code:'2025-06', name:'June 2025' },
  { code:'2025-07', name:'July 2025' },
  { code:'2025-08', name:'August 2025' },
  { code:'2025-09', name:'September 2025' },
  { code:'2025-10', name:'October 2025' },
  { code:'2025-11', name:'November 2025' },
  { code:'2025-12', name:'December 2025' },
]

const CATEGORIES = ['All','Current Asset','Non-Current Asset','Current Liability','Non-Current Liability','Equity','Expense']

type Mode = 'single' | 'range' | 'ytd' | 'full'

interface TBRow {
  account_number: number
  account_name: string
  account_category: string
  normal_balance: string
  opening_balance: number
  period_debits: number
  period_credits: number
  net_movement: number
  closing_balance: number
  txn_count: number
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const abs = Math.abs(n)
  const s = abs >= 1000000
    ? '$' + (abs / 1000000).toFixed(2) + 'M'
    : abs >= 1000
    ? '$' + (abs / 1000).toFixed(1) + 'K'
    : '$' + abs.toFixed(2)
  return n < 0 ? `(${s})` : s
}

function fmtFull(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const abs = Math.abs(n)
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `(${s})` : s
}

export default function TrialBalance({ onClose }: { onClose: () => void }) {
  const [mode, setMode]           = useState<Mode>('single')
  const [period, setPeriod]       = useState('2025-06')
  const [fromPeriod, setFrom]     = useState('2025-01')
  const [toPeriod, setTo]         = useState('2025-03')
  const [category, setCategory]   = useState('All')
  const [rows, setRows]           = useState<TBRow[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [generated, setGenerated] = useState(false)
  const [reportTitle, setReportTitle] = useState('')

  const sb = createClient()

  async function generate() {
    setLoading(true); setError(''); setRows([])
    try {
      const cat = category === 'All' ? null : category
      let query: any
      let title = ''

      if (mode === 'single') {
        const p = PERIODS.find(x => x.code === period)
        title = `Trial Balance — ${p?.name ?? period}`
        query = sb.rpc('get_trial_balance', { p_period_code: period, p_category: cat })
      } else if (mode === 'range') {
        const f = PERIODS.find(x => x.code === fromPeriod)
        const t = PERIODS.find(x => x.code === toPeriod)
        title = `Trial Balance — ${f?.name ?? fromPeriod} to ${t?.name ?? toPeriod}`
        query = sb.rpc('get_trial_balance', { p_from_period: fromPeriod, p_to_period: toPeriod, p_category: cat })
      } else if (mode === 'ytd') {
        const p = PERIODS.find(x => x.code === period)
        const mon = p?.name.split(' ')[0] ?? ''
        title = `Trial Balance — YTD to ${mon} 2025`
        query = sb.rpc('get_trial_balance', { p_from_period: '2025-01', p_to_period: period, p_category: cat })
      } else {
        title = `Trial Balance — Full Year 2025`
        query = sb.rpc('get_trial_balance', { p_fiscal_year: 2025, p_category: cat })
      }

      const { data, error: err } = await query
      if (err) throw err
      setRows(data ?? [])
      setReportTitle(title)
      setGenerated(true)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load trial balance')
    } finally {
      setLoading(false)
    }
  }

  // Group rows by category
  const grouped = rows.reduce((acc: Record<string, TBRow[]>, row) => {
    const cat = row.account_category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(row)
    return acc
  }, {})

  const catOrder = ['Current Asset','Non-Current Asset','Current Liability','Non-Current Liability','Equity','Expense']

  // Totals per category and grand totals
  function catTotals(catRows: TBRow[]) {
    return {
      opening:  catRows.reduce((s, r) => s + Number(r.opening_balance), 0),
      debits:   catRows.reduce((s, r) => s + Number(r.period_debits), 0),
      credits:  catRows.reduce((s, r) => s + Number(r.period_credits), 0),
      movement: catRows.reduce((s, r) => s + Number(r.net_movement), 0),
      closing:  catRows.reduce((s, r) => s + Number(r.closing_balance), 0),
      count:    catRows.reduce((s, r) => s + Number(r.txn_count), 0),
    }
  }

  const grandTotals = {
    debits:   rows.reduce((s, r) => s + Number(r.period_debits), 0),
    credits:  rows.reduce((s, r) => s + Number(r.period_credits), 0),
    movement: rows.reduce((s, r) => s + Number(r.net_movement), 0),
    count:    rows.reduce((s, r) => s + Number(r.txn_count), 0),
  }

  const isBalanced = Math.abs(grandTotals.debits - grandTotals.credits) < 0.01

  return (
    <div className={styles.wrap}>

      {/* ── CONTROLS BAR ── */}
      <div className={styles.controls}>
        <div className={styles.controlsLeft}>

          {/* Mode selector */}
          <div className={styles.modeGroup}>
            {([
              {v:'single', l:'Single Period'},
              {v:'range',  l:'Date Range'},
              {v:'ytd',    l:'YTD'},
              {v:'full',   l:'Full Year'},
            ] as {v:Mode, l:string}[]).map(m => (
              <button key={m.v}
                className={`${styles.modeBtn} ${mode===m.v?styles.modeBtnActive:''}`}
                onClick={() => setMode(m.v)}
              >{m.l}</button>
            ))}
          </div>

          {/* Period pickers */}
          <div className={styles.pickers}>
            {(mode === 'single' || mode === 'ytd') && (
              <div className={styles.pickerGroup}>
                <label>{mode === 'ytd' ? 'Up to period' : 'Period'}</label>
                <select value={period} onChange={e => setPeriod(e.target.value)} className={styles.select}>
                  {PERIODS.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>
              </div>
            )}
            {mode === 'range' && (<>
              <div className={styles.pickerGroup}>
                <label>From</label>
                <select value={fromPeriod} onChange={e => setFrom(e.target.value)} className={styles.select}>
                  {PERIODS.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>
              </div>
              <div className={styles.pickerGroup}>
                <label>To</label>
                <select value={toPeriod} onChange={e => setTo(e.target.value)} className={styles.select}>
                  {PERIODS.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>
              </div>
            </>)}
            {mode === 'full' && (
              <div className={styles.pickerGroup}>
                <label>Fiscal Year</label>
                <select className={styles.select} defaultValue="2025"><option value="2025">2025</option></select>
              </div>
            )}

            {/* Category filter */}
            <div className={styles.pickerGroup}>
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={styles.select}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <button className={styles.generateBtn} onClick={generate} disabled={loading}>
          {loading ? <span className={styles.spinner} /> : null}
          {loading ? 'Generating…' : 'Generate Report'}
        </button>
      </div>

      {/* ── REPORT ── */}
      {!generated && !loading && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>≡</div>
          <div className={styles.emptyTitle}>Trial Balance Report</div>
          <div className={styles.emptyDesc}>Select a period and click Generate Report</div>
        </div>
      )}

      {error && (
        <div className={styles.errorMsg}>{error}</div>
      )}

      {generated && rows.length > 0 && (
        <div className={styles.report}>

          {/* Report header */}
          <div className={styles.reportHeader}>
            <div className={styles.reportCo}>ABC PT, Inc.</div>
            <div className={styles.reportTitle}>{reportTitle}</div>
            <div className={styles.reportMeta}>
              Generated {new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
              &nbsp;·&nbsp; {rows.length} accounts
              &nbsp;·&nbsp;
              <span className={isBalanced ? styles.balanced : styles.unbalanced}>
                {isBalanced ? '✓ Balanced' : '⚠ Out of balance'}
              </span>
            </div>
          </div>

          {/* Summary cards */}
          <div className={styles.summaryCards}>
            {[
              { l:'Total Debits',   v: grandTotals.debits,   c:'#3b82f6' },
              { l:'Total Credits',  v: grandTotals.credits,  c:'#8b5cf6' },
              { l:'Net Movement',   v: grandTotals.movement, c: grandTotals.movement >= 0 ? '#10b981' : '#ef4444' },
              { l:'Transactions',   v: grandTotals.count,    c:'#f59e0b', isCount: true },
            ].map(s => (
              <div key={s.l} className={styles.summaryCard}>
                <div className={styles.summaryVal} style={{color: s.c}}>
                  {s.isCount ? Number(s.v).toLocaleString() : fmt(s.v)}
                </div>
                <div className={styles.summaryLbl}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thAcct}>Account</th>
                  <th className={styles.thName}>Account Name</th>
                  <th className={styles.thNum}>Opening Balance</th>
                  <th className={styles.thNum}>Debits</th>
                  <th className={styles.thNum}>Credits</th>
                  <th className={styles.thNum}>Net Movement</th>
                  <th className={styles.thNum}>Closing Balance</th>
                  <th className={styles.thTxn}>Txns</th>
                </tr>
              </thead>
              <tbody>
                {catOrder.filter(c => grouped[c]?.length).map(cat => {
                  const catRows = grouped[cat]
                  const totals  = catTotals(catRows)
                  return [
                    // Category header
                    <tr key={`cat-${cat}`} className={styles.catHeader}>
                      <td colSpan={8}>{cat}</td>
                    </tr>,
                    // Account rows
                    ...catRows.map(row => (
                      <tr key={row.account_number} className={styles.dataRow}>
                        <td className={styles.tdAcct}>{row.account_number}</td>
                        <td className={styles.tdName}>{row.account_name}</td>
                        <td className={`${styles.tdNum} ${Number(row.opening_balance) < 0 ? styles.neg : ''}`}>
                          {fmtFull(Number(row.opening_balance))}
                        </td>
                        <td className={styles.tdNum}>{fmtFull(Number(row.period_debits))}</td>
                        <td className={styles.tdNum}>{fmtFull(Number(row.period_credits))}</td>
                        <td className={`${styles.tdNum} ${Number(row.net_movement) < 0 ? styles.neg : styles.pos}`}>
                          {fmtFull(Number(row.net_movement))}
                        </td>
                        <td className={`${styles.tdNum} ${Number(row.closing_balance) < 0 ? styles.neg : ''}`}>
                          {fmtFull(Number(row.closing_balance))}
                        </td>
                        <td className={styles.tdTxn}>{Number(row.txn_count).toLocaleString()}</td>
                      </tr>
                    )),
                    // Category subtotal
                    <tr key={`sub-${cat}`} className={styles.subtotalRow}>
                      <td colSpan={2} className={styles.subtotalLabel}>Subtotal — {cat}</td>
                      <td className={`${styles.tdNum} ${totals.opening < 0 ? styles.neg : ''}`}>{fmtFull(totals.opening)}</td>
                      <td className={styles.tdNum}>{fmtFull(totals.debits)}</td>
                      <td className={styles.tdNum}>{fmtFull(totals.credits)}</td>
                      <td className={`${styles.tdNum} ${totals.movement < 0 ? styles.neg : styles.pos}`}>{fmtFull(totals.movement)}</td>
                      <td className={`${styles.tdNum} ${totals.closing < 0 ? styles.neg : ''}`}>{fmtFull(totals.closing)}</td>
                      <td className={styles.tdTxn}>{totals.count.toLocaleString()}</td>
                    </tr>,
                  ]
                })}
              </tbody>
              <tfoot>
                <tr className={styles.grandTotal}>
                  <td colSpan={2}>Grand Total</td>
                  <td className={styles.tdNum}>—</td>
                  <td className={styles.tdNum}>{fmtFull(grandTotals.debits)}</td>
                  <td className={styles.tdNum}>{fmtFull(grandTotals.credits)}</td>
                  <td className={`${styles.tdNum} ${grandTotals.movement < 0 ? styles.neg : styles.pos}`}>{fmtFull(grandTotals.movement)}</td>
                  <td className={styles.tdNum}>—</td>
                  <td className={styles.tdTxn}>{Number(grandTotals.count).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      )}
    </div>
  )
}
