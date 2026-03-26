'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import styles from './UserActivityAudit.module.css'

interface UARow {
  user_posting:string; txn_count:number; total_volume:number; avg_amount:number;
  max_amount:number; accounts_touched:number; doc_types_used:number;
  weekend_postings:number; large_txn_count:number; zero_amount_count:number;
  first_posting:string; last_posting:string; risk_level:string;
}
const RISK_COLOR: Record<string,string> = { HIGH:'#ef4444', MEDIUM:'#f59e0b', LOW:'#10b981' }
function fmt(n:number):string {
  const a=Math.abs(n)
  if(a>=1000000) return '$'+(a/1000000).toFixed(1)+'M'
  if(a>=1000) return '$'+(a/1000).toFixed(0)+'K'
  return '$'+a.toFixed(0)
}

export default function UserActivityAudit() {
  const [rows, setRows]   = useState<UARow[]>([])
  const [filter, setFilter] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => {
    let q = sb.from('user_activity_audit').select('*').order('txn_count', {ascending:false}).limit(50)
    if (filter !== 'ALL') q = q.eq('risk_level', filter)
    q.then(({data}) => { setRows((data||[]) as UARow[]); setLoading(false) })
  }, [filter])

  const totalVol = rows.reduce((s,r)=>s+Number(r.total_volume),0)
  const high=rows.filter(r=>r.risk_level==='HIGH').length
  const med=rows.filter(r=>r.risk_level==='MEDIUM').length

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>User Activity Audit</div>
          <div className={styles.sub}>120 unique posting users · Segregation of duties & volume analysis</div>
        </div>
        <div className={styles.badges}>
          <span className={styles.badge} style={{color:'#ef4444',background:'rgba(239,68,68,.12)',borderColor:'#ef444455'}}>{high} HIGH</span>
          <span className={styles.badge} style={{color:'#f59e0b',background:'rgba(245,158,11,.12)',borderColor:'#f59e0b55'}}>{med} MEDIUM</span>
        </div>
      </div>

      <div className={styles.filterRow}>
        {['ALL','HIGH','MEDIUM','LOW'].map(f=>(
          <button key={f} className={`${styles.filterBtn} ${filter===f?styles.filterActive:''}`}
            style={filter===f && f!=='ALL'?{borderColor:RISK_COLOR[f],color:RISK_COLOR[f],background:RISK_COLOR[f]+'18'}:{}}
            onClick={()=>setFilter(f)}>{f}</button>
        ))}
        <span className={styles.totalVol}>Total volume shown: {fmt(totalVol)}</span>
      </div>

      {loading ? (
        <div className={styles.loading}><div className={styles.spinner}/></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th><th>Risk</th><th>Txn Count</th><th>Total Volume</th>
                <th>Avg Amount</th><th>Max Amount</th><th>Accounts</th>
                <th>Weekends</th><th>Large Txns</th><th>Zero Amt</th>
                <th>First Post</th><th>Last Post</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row=>(
                <tr key={row.user_posting}>
                  <td><span className={styles.userName}>{row.user_posting}</span></td>
                  <td><span className={styles.riskBadge} style={{color:RISK_COLOR[row.risk_level],background:RISK_COLOR[row.risk_level]+'18',borderColor:RISK_COLOR[row.risk_level]+'55'}}>{row.risk_level}</span></td>
                  <td className={styles.mono}>{Number(row.txn_count).toLocaleString()}</td>
                  <td className={styles.mono} style={{color:'#10b981'}}>{fmt(Number(row.total_volume))}</td>
                  <td className={styles.mono}>{fmt(Number(row.avg_amount))}</td>
                  <td className={styles.mono} style={{color:Number(row.max_amount)>1000000?'#ef4444':undefined}}>{fmt(Number(row.max_amount))}</td>
                  <td className={styles.mono}>{row.accounts_touched}</td>
                  <td className={styles.mono} style={{color:Number(row.weekend_postings)>50?'#f59e0b':undefined}}>{Number(row.weekend_postings).toLocaleString()}</td>
                  <td className={styles.mono} style={{color:Number(row.large_txn_count)>5?'#ef4444':undefined}}>{row.large_txn_count}</td>
                  <td className={styles.mono} style={{color:Number(row.zero_amount_count)>10?'#f59e0b':undefined}}>{row.zero_amount_count}</td>
                  <td className={styles.mono}>{row.first_posting}</td>
                  <td className={styles.mono}>{row.last_posting}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
