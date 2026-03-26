'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { NODE_COLORS, EDGES } from './nodeData'
import type { NodeId } from './nodeData'
import styles from './DetailPanel.module.css'

const NODE_META: Record<NodeId,{icon:string;label:string;desc:string}> = {
  gl:       {icon:'📊', label:'GL Transactions',   desc:'Raw general ledger rows loaded from CSV batches.'},
  coa:      {icon:'📋', label:'Chart of Accounts', desc:'51 accounts across 6 IFRS categories.'},
  period:   {icon:'📅', label:'Accounting Periods',desc:'12 monthly periods for FY 2025.'},
  party:    {icon:'🏢', label:'Parties',           desc:'6,380 validated party names extracted from GL.'},
  client:   {icon:'👥', label:'Clients',           desc:'Unique client entity master, deduped by canonical name.'},
  supplier: {icon:'🏭', label:'Suppliers',         desc:'Unique supplier entity master, deduped by canonical name.'},
  ugl:      {icon:'✦',  label:'Universal GL',      desc:'Validated & classified GL — every row matched to a rule.'},
  payment:  {icon:'💳', label:'Payments',          desc:'All cash movements with resolved payor/payee.'},
  rule:     {icon:'⚙',  label:'GL Rules',          desc:'28 classification rules mapping doc_type + sign → category.'},
}
const EDGE_COLORS: Record<string,string> = {fk:'#3b82f6',derived:'#f59e0b',trigger:'#a78bfa',rule:'#84cc16'}
const CAT_COLORS: Record<string,string>  = {
  ACCRUAL:'#8b5cf6',RECEIPT:'#10b981',PAYMENT:'#ec4899',JOURNAL:'#06b6d4',REVERSAL:'#f59e0b',OTHER:'#64748b'
}
const AMT_COLS = new Set(['amount','total_revenue','total_spend','total_transaction_amount'])

function fmtAmt(n: number, short=false): string {
  const abs = Math.abs(n)
  const str = short
    ? abs>=1000000 ? '$'+(abs/1000000).toFixed(1)+'M' : abs>=1000 ? '$'+(abs/1000).toFixed(0)+'K' : '$'+abs.toFixed(0)
    : '$'+abs.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
  return n < 0 ? '('+str+')' : str
}
function fmtVal(v: unknown): string {
  if (v===null||v===undefined) return '—'
  if (typeof v==='boolean') return v ? '✓ Yes' : '✗ No'
  const s=String(v); return s.length>44 ? s.slice(0,44)+'…' : s
}

export default function DetailPanel({nodeId, stats}: {nodeId: NodeId|null; stats: Record<string,number>}) {
  const [rows, setRows]     = useState<Record<string,unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Record<string,unknown>>({})
  const sb = createClient()

  useEffect(() => {
    if (!nodeId) { setRows([]); setSummary({}); return }
    setLoading(true)

    // Purpose-built summaries per node
    if (nodeId === 'ugl') {
      sb.from('ugl').select('transaction_category').then(({data}) => {
        const counts: Record<string,number> = {}
        data?.forEach(r => { counts[r.transaction_category] = (counts[r.transaction_category]||0)+1 })
        setSummary(counts); setLoading(false)
      })
    } else if (nodeId === 'payment') {
      sb.from('payments').select('transaction_type,amount').then(({data}) => {
        const byType: Record<string,{count:number;total:number}> = {}
        data?.forEach(r => {
          const t = r.transaction_type as string
          if (!byType[t]) byType[t]={count:0,total:0}
          byType[t].count++; byType[t].total+=Number(r.amount)
        })
        setSummary(byType); setLoading(false)
      })
    } else if (nodeId === 'coa') {
      sb.from('chart_of_accounts').select('account_category,account_number').then(({data}) => {
        const counts: Record<string,number> = {}
        data?.forEach(r => { counts[r.account_category]=(counts[r.account_category]||0)+1 })
        setSummary(counts); setLoading(false)
      })
    } else {
      setSummary({}); setLoading(false)
    }

    // Rows table for all nodes
    const queries: Record<NodeId,{t:string;s:string;o:string;lim:number}> = {
      gl:      {t:'gl_transactions',  s:'row_id,account_number,transaction_date,amount,transaction_type,document_type,comments',o:'row_id.desc',lim:20},
      coa:     {t:'chart_of_accounts',s:'account_number,account_name,account_category,normal_balance',o:'account_number.asc',lim:51},
      period:  {t:'accounting_periods',s:'period_code,period_name,fiscal_year,start_date,end_date,is_closed',o:'period_code.asc',lim:12},
      party:   {t:'parties',          s:'party_id,party_name,party_type,total_transaction_amount,transaction_count',o:'transaction_count.desc',lim:20},
      client:  {t:'clients',          s:'client_id,client_name,total_revenue,transaction_count,first_seen_date,last_seen_date',o:'total_revenue.desc',lim:20},
      supplier:{t:'suppliers',        s:'supplier_id,supplier_name,total_spend,transaction_count,first_seen_date',o:'total_spend.asc',lim:20},
      ugl:     {t:'ugl',              s:'ugl_id,transaction_date,transaction_category,transaction_subcategory,amount,document_type,is_validated',o:'ugl_id.desc',lim:20},
      payment: {t:'payments',         s:'payment_id,payment_date,payor_name,payee_name,amount,transaction_type,payment_method',o:'payment_id.desc',lim:20},
      rule:    {t:'gl_rules',         s:'rule_id,rule_name,document_type,amount_sign,transaction_category,transaction_subcategory,priority,is_active',o:'priority.asc',lim:28},
    }
    const q = queries[nodeId]
    let query = sb.from(q.t).select(q.s).limit(q.lim)
    const [col, dir] = q.o.split('.')
    query = query.order(col, {ascending: dir==='asc'})
    query.then(({data}) => setRows((data as Record<string,unknown>[]|null)??[]))
  }, [nodeId])

  if (!nodeId) return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>◎</div>
      <div className={styles.emptyText}>click a node<br/>to explore data</div>
    </div>
  )

  const meta = NODE_META[nodeId]
  const col  = NODE_COLORS[nodeId]
  const nodeEdges = EDGES.filter(e => e.from===nodeId||e.to===nodeId)
  const cols = rows[0] ? Object.keys(rows[0]) : []

  return (
    <div className={styles.panel}>
      {/* Node header */}
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon} style={{background:`${col}22`,border:`1px solid ${col}44`}}>{meta.icon}</div>
        <div>
          <div className={styles.nodeTitle}>{meta.label}</div>
          <div className={styles.nodeType} style={{color:col}}>{stats[nodeId]?.toLocaleString()} records</div>
        </div>
      </div>
      <p className={styles.nodeDesc}>{meta.desc}</p>

      {/* Purpose-built summary cards */}
      {nodeId === 'ugl' && Object.keys(summary).length > 0 && (
        <div className={styles.summarySection}>
          <div className={styles.sectionTitle}>Transaction Categories</div>
          {Object.entries(summary).map(([cat, cnt]) => (
            <div key={cat} className={styles.summaryBar}>
              <span className={styles.sumDot} style={{background:CAT_COLORS[cat]||'#888'}} />
              <span className={styles.sumLabel}>{cat}</span>
              <div className={styles.sumBarWrap}>
                <div className={styles.sumBar} style={{
                  width:`${Math.round((Number(cnt)/500000)*100)}%`,
                  background:CAT_COLORS[cat]||'#888'
                }} />
              </div>
              <span className={styles.sumVal}>{(Number(cnt)/1000).toFixed(0)}K</span>
            </div>
          ))}
        </div>
      )}

      {nodeId === 'payment' && Object.keys(summary).length > 0 && (
        <div className={styles.summarySection}>
          <div className={styles.sectionTitle}>By Transaction Type</div>
          {Object.entries(summary as Record<string,{count:number;total:number}>).map(([type,data]) => (
            <div key={type} className={styles.summaryRow}>
              <span className={styles.sumLabel}>{type}</span>
              <span className={styles.sumCount}>{data.count.toLocaleString()} txns</span>
              <span className={styles.sumAmt} style={{color:'#10b981'}}>{fmtAmt(data.total,true)}</span>
            </div>
          ))}
        </div>
      )}

      {nodeId === 'coa' && Object.keys(summary).length > 0 && (
        <div className={styles.summarySection}>
          <div className={styles.sectionTitle}>Account Categories</div>
          {Object.entries(summary).map(([cat, cnt]) => (
            <div key={cat} className={styles.summaryRow}>
              <span className={styles.sumLabel}>{cat}</span>
              <span className={styles.sumCount}>{String(cnt)} accounts</span>
            </div>
          ))}
        </div>
      )}

      {/* Relationships */}
      <div className={styles.sectionTitle}>Relationships</div>
      <div className={styles.edgeList}>
        {nodeEdges.map((e,i) => {
          const isOut = e.from===nodeId
          const eCol  = EDGE_COLORS[e.type]||'#888'
          return (
            <div key={i} className={styles.edgeItem}>
              <span className={styles.edgeArrow} style={{color:eCol}}>{isOut?'→':'←'}</span>
              <span className={styles.edgeTarget}>{isOut?e.to:e.from}</span>
              <span className={styles.edgeLabel}>{e.label}</span>
            </div>
          )
        })}
      </div>

      {/* Live data table */}
      {loading && <div className={styles.sectionTitle} style={{marginTop:12}}><span className={styles.loading}>loading data…</span></div>}
      {!loading && rows.length > 0 && (<>
        <div className={styles.sectionTitle} style={{marginTop:12}}>Live Data <span style={{color:'var(--dim)',fontWeight:400}}>· {rows.length} rows</span></div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>{cols.map(c => <th key={c}>{c.replace(/_/g,' ')}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row,i) => (
                <tr key={i}>
                  {cols.map(c => (
                    <td key={c} className={AMT_COLS.has(c)?styles.amount:''}>
                      {AMT_COLS.has(c)
                        ? <span style={{color:parseFloat(String(row[c]))<0?'#f87171':'#34d399'}}>{fmtAmt(parseFloat(String(row[c])),true)}</span>
                        : fmtVal(row[c])
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}
    </div>
  )
}
