'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import styles from './JETesting.module.css'

interface JERow {
  row_id:number; transaction_date:string; account_number:number; account_name:string;
  account_category:string; amount:number; document_type:string; user_posting:string;
  comments:string; risk_score:number;
  is_zero_amount:boolean; is_large_txn:boolean; is_round_number:boolean;
  is_weekend:boolean; is_reversal:boolean; is_void_check:boolean; is_period_end:boolean;
}

const FLAGS = [
  { key:'is_large_txn',    label:'Large >$1M',    color:'#ef4444' },
  { key:'is_weekend',      label:'Weekend',        color:'#f97316' },
  { key:'is_round_number', label:'Round Number',   color:'#f59e0b' },
  { key:'is_zero_amount',  label:'Zero Amount',    color:'#8b5cf6' },
  { key:'is_reversal',     label:'Reversal',       color:'#06b6d4' },
  { key:'is_void_check',   label:'Void Check',     color:'#ec4899' },
  { key:'is_period_end',   label:'Period End',     color:'#64748b' },
]

function fmtAmt(n:number):string {
  const a=Math.abs(n)
  const s=a>=1000000?'$'+(a/1000000).toFixed(2)+'M':a>=1000?'$'+(a/1000).toFixed(1)+'K':'$'+a.toFixed(2)
  return n<0?`(${s})`:s
}

export default function JETesting() {
  const [rows, setRows]       = useState<JERow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<string[]>([])
  const [minScore, setMinScore] = useState(1)
  const [page, setPage]       = useState(0)
  const [total, setTotal]     = useState(0)
  const PAGE = 50
  const sb = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    let q = sb.from('je_risk_flags').select('*', {count:'exact'})
      .gte('risk_score', minScore)
      .order('risk_score', {ascending:false})
    filter.forEach(f => { q = q.eq(f as keyof JERow, true) })
    const {data, count} = await q.range(page*PAGE, page*PAGE+PAGE-1)
    setRows((data||[]) as JERow[])
    setTotal(count||0)
    setLoading(false)
  }, [filter, minScore, page])

  useEffect(() => { load() }, [load])

  function toggleFlag(k:string) {
    setFilter(f => f.includes(k) ? f.filter(x=>x!==k) : [...f,k])
    setPage(0)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Journal Entry Testing</div>
          <div className={styles.sub}>Risk-based JE analysis · {total.toLocaleString()} flagged entries</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className={styles.filters}>
        <div className={styles.filterLabel}>Risk flags:</div>
        {FLAGS.map(f=>(
          <button key={f.key}
            className={`${styles.flagBtn} ${filter.includes(f.key)?styles.flagActive:''}`}
            style={filter.includes(f.key)?{background:f.color+'22',borderColor:f.color,color:f.color}:{}}
            onClick={()=>toggleFlag(f.key)}>
            {f.label}
          </button>
        ))}
        <div className={styles.scoreFilter}>
          <span className={styles.filterLabel}>Min score:</span>
          {[1,2,3,4].map(s=>(
            <button key={s} className={`${styles.scoreBtn} ${minScore===s?styles.scoreBtnActive:''}`}
              onClick={()=>{setMinScore(s);setPage(0)}}>{s}+</button>
          ))}
        </div>
        {(filter.length>0||minScore>1) && (
          <button className={styles.clearBtn} onClick={()=>{setFilter([]);setMinScore(1);setPage(0)}}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.loading}><div className={styles.spinner}/></div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th><th>Account</th><th>Amount</th>
                <th>User</th><th>Doc Type</th><th>Comments</th>
                <th>Risk Flags</th><th>Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row=>(
                <tr key={row.row_id}>
                  <td className={styles.mono}>{row.transaction_date}</td>
                  <td>
                    <div className={styles.acctNum}>{row.account_number}</div>
                    <div className={styles.acctName}>{row.account_name}</div>
                  </td>
                  <td className={styles.amount} style={{color:row.amount<0?'#f87171':'#34d399'}}>
                    {fmtAmt(row.amount)}
                  </td>
                  <td className={styles.mono}>{row.user_posting||'—'}</td>
                  <td><span className={styles.docType}>{row.document_type}</span></td>
                  <td className={styles.comments}>{row.comments||'—'}</td>
                  <td>
                    <div className={styles.flagRow}>
                      {FLAGS.filter(f=>row[f.key as keyof JERow]).map(f=>(
                        <span key={f.key} className={styles.flag} style={{background:f.color+'22',color:f.color,borderColor:f.color+'55'}}>
                          {f.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={styles.score} style={{
                      background:row.risk_score>=3?'rgba(239,68,68,.15)':row.risk_score>=2?'rgba(245,158,11,.15)':'rgba(16,185,129,.15)',
                      color:row.risk_score>=3?'#ef4444':row.risk_score>=2?'#f59e0b':'#10b981',
                    }}>{row.risk_score}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <span className={styles.pageInfo}>{page*PAGE+1}–{Math.min((page+1)*PAGE,total)} of {total.toLocaleString()}</span>
        <button className={styles.pageBtn} disabled={page===0} onClick={()=>setPage(p=>p-1)}>← Prev</button>
        <button className={styles.pageBtn} disabled={(page+1)*PAGE>=total} onClick={()=>setPage(p=>p+1)}>Next →</button>
      </div>
    </div>
  )
}
