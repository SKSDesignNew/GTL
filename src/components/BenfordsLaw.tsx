'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import styles from './BenfordsLaw.module.css'

interface BRow { digit:number; actual_count:number; actual_pct:number; expected_pct:number; deviation:number; risk_level:string }

export default function BenfordsLaw() {
  const [rows, setRows]   = useState<BRow[]>([])
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => {
    sb.from('benford_analysis').select('*').order('digit').then(({data}) => {
      setRows((data||[]) as BRow[])
      setLoading(false)
    })
  }, [])

  const maxPct = 35
  const RISK_COLOR: Record<string,string> = { HIGH:'#ef4444', MEDIUM:'#f59e0b', LOW:'#10b981' }
  const overallRisk = rows.some(r=>r.risk_level==='HIGH') ? 'HIGH' : rows.some(r=>r.risk_level==='MEDIUM') ? 'MEDIUM' : 'LOW'

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Benford&apos;s Law Analysis</div>
          <div className={styles.sub}>First-digit distribution · 498,226 non-zero transactions</div>
        </div>
        {!loading && (
          <div className={styles.verdict}>
            <div className={styles.verdictLabel}>Data Integrity</div>
            <div className={styles.verdictBadge} style={{color:RISK_COLOR[overallRisk],background:RISK_COLOR[overallRisk]+'22',borderColor:RISK_COLOR[overallRisk]}}>
              {overallRisk === 'LOW' ? '✓ NORMAL' : overallRisk + ' DEVIATION'}
            </div>
          </div>
        )}
      </div>

      <div className={styles.explainer}>
        Benford&apos;s Law states that in natural financial datasets, leading digits follow a logarithmic distribution.
        Significant deviation indicates possible manipulation, data entry errors, or fabricated transactions.
        Deviations &gt;3% are HIGH risk, &gt;1.5% are MEDIUM risk.
      </div>

      {loading ? (
        <div className={styles.loading}><div className={styles.spinner}/></div>
      ) : (
        <div className={styles.chart}>
          {rows.map(row => (
            <div key={row.digit} className={styles.digitRow}>
              <div className={styles.digitLabel}>{row.digit}</div>
              <div className={styles.bars}>
                {/* Expected */}
                <div className={styles.barWrap}>
                  <div className={styles.barExpected}
                    style={{width:`${(row.expected_pct/maxPct)*100}%`}}
                    title={`Expected: ${row.expected_pct}%`}/>
                </div>
                {/* Actual */}
                <div className={styles.barWrap}>
                  <div className={styles.barActual}
                    style={{
                      width:`${(row.actual_pct/maxPct)*100}%`,
                      background: RISK_COLOR[row.risk_level]
                    }}
                    title={`Actual: ${row.actual_pct}%`}/>
                </div>
              </div>
              <div className={styles.pcts}>
                <span className={styles.pctExpected}>{row.expected_pct}%</span>
                <span className={styles.pctActual} style={{color:RISK_COLOR[row.risk_level]}}>{row.actual_pct}%</span>
                <span className={styles.deviation} style={{color:RISK_COLOR[row.risk_level]}}>
                  {row.deviation > 0 ? '+' : ''}{row.deviation}%
                </span>
              </div>
              <span className={styles.riskBadge} style={{color:RISK_COLOR[row.risk_level],background:RISK_COLOR[row.risk_level]+'18',borderColor:RISK_COLOR[row.risk_level]+'44'}}>
                {row.risk_level}
              </span>
              <div className={styles.count}>{Number(row.actual_count).toLocaleString()}</div>
            </div>
          ))}
          <div className={styles.legend}>
            <span><span className={styles.legendDot} style={{background:'#475569'}}/>Expected</span>
            <span><span className={styles.legendDot} style={{background:'#10b981'}}/>Actual (Low)</span>
            <span><span className={styles.legendDot} style={{background:'#f59e0b'}}/>Actual (Medium)</span>
            <span><span className={styles.legendDot} style={{background:'#ef4444'}}/>Actual (High)</span>
          </div>
        </div>
      )}
    </div>
  )
}
