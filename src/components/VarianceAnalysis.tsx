'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import styles from './VarianceAnalysis.module.css'

interface VARow {
  account_number:number; account_name:string; account_category:string;
  period_code:string; net_movement:number; avg_movement:number;
  z_score:number; mom_change:number; mom_pct_change:number; risk_level:string;
}
const RISK_COLOR: Record<string,string> = { HIGH:'#ef4444', MEDIUM:'#f59e0b', LOW:'#10b981' }
function fmt(n:number|null):string {
  if(n===null||n===undefined) return '—'
  const a=Math.abs(n)
  const s=a>=1000000?'$'+(a/1000000).toFixed(1)+'M':a>=1000?'$'+(a/1000).toFixed(0)+'K':'$'+a.toFixed(0)
  return n<0?`(${s})`:s
}

export default function VarianceAnalysis() {
  const [rows, setRows]     = useState<VARow[]>([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => {
    let q = sb.from('variance_analysis').select('*').order('z_score',{ascending:false}).limit(100)
    if (filter !== 'ALL') q = q.eq('risk_level', filter)
    q.then(({data}) => { setRows((data||[]) as VARow[]); setLoading(false) })
  }, [filter])

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Variance Analysis</div>
          <div className={styles.sub}>Month-over-month flux · Z-score anomaly detection per account</div>
        </div>
      </div>

      <div className={styles.explainer}>
        Flags accounts where monthly movement deviates significantly from their own historical average.
        Z-score &gt;2.5 = HIGH, &gt;1.5 = MEDIUM. Also flags &gt;200% MoM change as HIGH, &gt;100% as MEDIUM.
      </div>

      <div className={styles.filterRow}>
        {['ALL','HIGH','MEDIUM','LOW'].map(f=>(
          <button key={f} className={`${styles.filterBtn} ${filter===f?styles.filterActive:''}`}
            style={filter===f && f!=='ALL'?{borderColor:RISK_COLOR[f],color:RISK_COLOR[f],background:RISK_COLOR[f]+'18'}:{}}
            onClick={()=>setFilter(f)}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}><div className={styles.spinner}/></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Account</th><th>Category</th><th>Period</th>
                <th>Net Movement</th><th>Avg Movement</th>
                <th>MoM Change</th><th>MoM %</th><th>Z-Score</th><th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row,i)=>(
                <tr key={i}>
                  <td>
                    <div className={styles.acctNum}>{row.account_number}</div>
                    <div className={styles.acctName}>{row.account_name}</div>
                  </td>
                  <td><span className={styles.category}>{row.account_category}</span></td>
                  <td className={styles.mono}>{row.period_code}</td>
                  <td className={styles.mono} style={{color:Number(row.net_movement)<0?'#f87171':'#34d399'}}>{fmt(Number(row.net_movement))}</td>
                  <td className={styles.mono}>{fmt(Number(row.avg_movement))}</td>
                  <td className={styles.mono} style={{color:Number(row.mom_change)<0?'#f87171':'#34d399'}}>{row.mom_change!=null?fmt(Number(row.mom_change)):'—'}</td>
                  <td className={styles.mono} style={{color:Math.abs(Number(row.mom_pct_change))>100?'#ef4444':'inherit'}}>
                    {row.mom_pct_change!=null?`${Number(row.mom_pct_change)>0?'+':''}${row.mom_pct_change}%`:'—'}
                  </td>
                  <td>
                    <span className={styles.zscore} style={{color:RISK_COLOR[row.risk_level],background:RISK_COLOR[row.risk_level]+'18'}}>
                      {row.z_score}
                    </span>
                  </td>
                  <td><span className={styles.riskBadge} style={{color:RISK_COLOR[row.risk_level],background:RISK_COLOR[row.risk_level]+'18',borderColor:RISK_COLOR[row.risk_level]+'55'}}>{row.risk_level}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
