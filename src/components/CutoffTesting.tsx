'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import styles from './CutoffTesting.module.css'

interface CTRow {
  row_id:number; transaction_date:string; amount:number; account_name:string;
  account_category:string; document_type:string; user_posting:string;
  comments:string; period_name:string; cutoff_zone:string; needs_cutoff_review:boolean;
}
const ZONE_COLOR: Record<string,string> = { PERIOD_END:'#ef4444', PERIOD_START:'#f59e0b', MID_PERIOD:'#10b981' }
function fmt(n:number):string {
  const a=Math.abs(n), s=a>=1000000?'$'+(a/1000000).toFixed(2)+'M':a>=1000?'$'+(a/1000).toFixed(1)+'K':'$'+a.toFixed(2)
  return n<0?`(${s})`:s
}

export default function CutoffTesting() {
  const [rows, setRows]     = useState<CTRow[]>([])
  const [zone, setZone]     = useState('ALL')
  const [reviewOnly, setReviewOnly] = useState(true)
  const [page, setPage]     = useState(0)
  const [total, setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const PAGE = 50
  const sb = createClient()

  useEffect(() => {
    setLoading(true)
    let q = sb.from('cutoff_testing').select('*',{count:'exact'}).order('transaction_date',{ascending:false})
    if (zone !== 'ALL') q = q.eq('cutoff_zone', zone)
    if (reviewOnly) q = q.eq('needs_cutoff_review', true)
    q.range(page*PAGE, page*PAGE+PAGE-1).then(({data,count}) => {
      setRows((data||[]) as CTRow[])
      setTotal(count||0)
      setLoading(false)
    })
  }, [zone, reviewOnly, page])

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Cut-off Testing</div>
          <div className={styles.sub}>Period-end & period-start entries · Revenue/expense recognition review</div>
        </div>
        <div className={styles.stats}>
          {[{label:'Period-End',val:'73,562',color:'#ef4444'},{label:'Period-Start',val:'68,945',color:'#f59e0b'},{label:'Needs Review',val:total.toLocaleString(),color:'#8b5cf6'}].map(s=>(
            <div key={s.label} className={styles.statChip} style={{borderColor:s.color+'55',background:s.color+'11'}}>
              <span className={styles.statVal} style={{color:s.color}}>{s.val}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.explainer}>
        Entries posted in the last 4 days of a period or first 4 days of the next may indicate cut-off misstatements — 
        revenue or expenses recognised in the wrong accounting period. Entries &gt;$10K are flagged for review.
      </div>

      <div className={styles.filterRow}>
        {['ALL','PERIOD_END','PERIOD_START'].map(z=>(
          <button key={z}
            className={`${styles.filterBtn} ${zone===z?styles.filterActive:''}`}
            style={zone===z&&z!=='ALL'?{borderColor:ZONE_COLOR[z],color:ZONE_COLOR[z],background:ZONE_COLOR[z]+'18'}:{}}
            onClick={()=>{setZone(z);setPage(0)}}>{z.replace('_',' ')}</button>
        ))}
        <label className={styles.toggleLabel}>
          <input type="checkbox" checked={reviewOnly} onChange={e=>{setReviewOnly(e.target.checked);setPage(0)}} className={styles.checkbox}/>
          Needs review only (&gt;$10K)
        </label>
      </div>

      {loading ? (
        <div className={styles.loading}><div className={styles.spinner}/></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Date</th><th>Period</th><th>Zone</th><th>Account</th><th>Amount</th><th>User</th><th>Doc Type</th><th>Comments</th></tr>
            </thead>
            <tbody>
              {rows.map(row=>(
                <tr key={row.row_id} className={row.needs_cutoff_review?styles.flaggedRow:''}>
                  <td className={styles.mono}>{row.transaction_date}</td>
                  <td className={styles.mono}>{row.period_name}</td>
                  <td><span className={styles.zone} style={{color:ZONE_COLOR[row.cutoff_zone],background:ZONE_COLOR[row.cutoff_zone]+'18',borderColor:ZONE_COLOR[row.cutoff_zone]+'55'}}>{row.cutoff_zone.replace('_',' ')}</span></td>
                  <td><div className={styles.acctName}>{row.account_name}</div><div className={styles.acctCat}>{row.account_category}</div></td>
                  <td className={styles.amount} style={{color:Number(row.amount)<0?'#f87171':'#34d399'}}>{fmt(Number(row.amount))}</td>
                  <td className={styles.mono}>{row.user_posting||'—'}</td>
                  <td><span className={styles.docType}>{row.document_type}</span></td>
                  <td className={styles.comments}>{row.comments||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.pagination}>
        <span className={styles.pageInfo}>{page*PAGE+1}–{Math.min((page+1)*PAGE,total)} of {total.toLocaleString()}</span>
        <button className={styles.pageBtn} disabled={page===0} onClick={()=>setPage(p=>p-1)}>← Prev</button>
        <button className={styles.pageBtn} disabled={(page+1)*PAGE>=total} onClick={()=>setPage(p=>p+1)}>Next →</button>
      </div>
    </div>
  )
}
