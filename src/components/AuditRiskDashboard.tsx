'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import styles from './AuditRiskDashboard.module.css'

interface RiskItem { risk_item:string; count:number; amount:number|null; severity:string; category:string }
const SEV_COLOR: Record<string,string> = { HIGH:'#ef4444', MEDIUM:'#f59e0b', LOW:'#10b981' }
const SEV_BG:    Record<string,string> = { HIGH:'rgba(239,68,68,.1)', MEDIUM:'rgba(245,158,11,.1)', LOW:'rgba(16,185,129,.1)' }
function fmt(n:number|null):string {
  if (!n) return '—'
  const a = Math.abs(n)
  if (a>=1000000) return '$'+(a/1000000).toFixed(1)+'M'
  if (a>=1000) return '$'+(a/1000).toFixed(0)+'K'
  return '$'+a.toFixed(2)
}

export default function AuditRiskDashboard() {
  const [items, setItems] = useState<RiskItem[]>([])
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => {
    sb.from('audit_risk_summary').select('*').then(({data}) => {
      setItems((data||[]) as RiskItem[])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className={styles.loading}><div className={styles.spinner}/></div>

  const high=items.filter(i=>i.severity==='HIGH')
  const medium=items.filter(i=>i.severity==='MEDIUM')
  const low=items.filter(i=>i.severity==='LOW')
  const highCount=high.reduce((s,i)=>s+Number(i.count),0)
  const medCount=medium.reduce((s,i)=>s+Number(i.count),0)

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Audit Risk Dashboard</div>
          <div className={styles.sub}>FY 2025 · 500K GL rows · {new Date().toLocaleDateString()}</div>
        </div>
        <div className={styles.overallScore}>
          <div className={styles.scoreLabel}>Overall Risk</div>
          <div className={styles.scoreBadge} style={{background:highCount>100?'rgba(239,68,68,.15)':'rgba(245,158,11,.15)',color:highCount>100?'#ef4444':'#f59e0b',borderColor:highCount>100?'#ef4444':'#f59e0b'}}>
            {highCount>100?'HIGH':'MEDIUM'}
          </div>
        </div>
      </div>

      <div className={styles.strip}>
        {[
          {label:'High Risk Items',   val:high.length,             color:'#ef4444',bg:'rgba(239,68,68,.08)',bc:'#ef444444'},
          {label:'High Risk Count',   val:highCount.toLocaleString(),color:'#ef4444',bg:'rgba(239,68,68,.08)',bc:'#ef444444'},
          {label:'Medium Risk Items', val:medium.length,           color:'#f59e0b',bg:'rgba(245,158,11,.08)',bc:'#f59e0b44'},
          {label:'Medium Risk Count', val:medCount.toLocaleString(),color:'#f59e0b',bg:'rgba(245,158,11,.08)',bc:'#f59e0b44'},
          {label:'Low Risk Items',    val:low.length,              color:'#10b981',bg:'rgba(16,185,129,.08)',bc:'#10b98144'},
        ].map(s=>(
          <div key={s.label} className={styles.stripCard} style={{background:s.bg,borderColor:s.bc}}>
            <div className={styles.stripVal} style={{color:s.color}}>{s.val}</div>
            <div className={styles.stripLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {(['HIGH','MEDIUM','LOW'] as const).map(sev => {
        const sevItems=items.filter(i=>i.severity===sev)
        if (!sevItems.length) return null
        return (
          <div key={sev} className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sevBadge} style={{background:SEV_BG[sev],color:SEV_COLOR[sev],borderColor:SEV_COLOR[sev]+'66'}}>{sev}</span>
              <span className={styles.sectionTitle}>{sev} Risk Items</span>
              <span className={styles.sectionCount}>{sevItems.length} items</span>
            </div>
            <div className={styles.riskTable}>
              {sevItems.map((item,i)=>(
                <div key={i} className={styles.riskRow}>
                  <div className={styles.riskDot} style={{background:SEV_COLOR[sev]}}/>
                  <div className={styles.riskName}>{item.risk_item}</div>
                  <div className={styles.riskCount}>{Number(item.count).toLocaleString()} txns</div>
                  <div className={styles.riskAmount}>{fmt(item.amount)}</div>
                  <div className={styles.riskCategory}>{item.category}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
      <div className={styles.footer}>AuditQens · Live queries · Not a substitute for professional audit judgement</div>
    </div>
  )
}
