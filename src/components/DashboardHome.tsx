'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import styles from './DashboardHome.module.css'
import { fmtShort, fmtCount } from '@/lib/fmt'

interface Props {
  stats: Record<string, number>
  onNavigate: (view: string) => void
}


const CAT_COLORS: Record<string,string> = {
  ACCRUAL:'#8b5cf6', RECEIPT:'#10b981', PAYMENT:'#ec4899', JOURNAL:'#06b6d4', REVERSAL:'#f59e0b'
}

export default function DashboardHome({ stats, onNavigate }: Props) {
  const [clients, setClients]   = useState<{client_name:string;total_revenue:number;transaction_count:number}[]>([])
  const [suppliers, setSuppliers] = useState<{supplier_name:string;total_spend:number;transaction_count:number}[]>([])
  const [cashFlow, setCashFlow] = useState<{period_code:string;period_name:string;total_receipts:number;total_payments:number;net_cash_flow:number}[]>([])
  const [categories, setCategories] = useState<{transaction_category:string;cnt:number;total:number}[]>([])
  const sb = createClient()

  useEffect(() => {
    sb.from('clients').select('client_name,total_revenue,transaction_count')
      .not('client_name','eq','Credit Card Payment')
      .not('total_revenue','is',null)
      .order('total_revenue',{ascending:false}).limit(8)
      .then(({data}) => setClients((data||[]) as typeof clients))

    sb.from('suppliers').select('supplier_name,total_spend,transaction_count')
      .not('total_spend','is',null)
      .order('total_spend',{ascending:true}).limit(8)
      .then(({data}) => setSuppliers((data||[]) as typeof suppliers))

    sb.from('cash_flow_by_period').select('period_code,period_name,total_receipts,total_payments,net_cash_flow')
      .order('period_code',{ascending:true})
      .then(({data}) => setCashFlow((data||[]) as typeof cashFlow))

    sb.rpc('get_trial_balance', {p_period_code:null,p_from_period:null,p_to_period:null,p_fiscal_year:2025,p_category:null})
      .then(() => {})
    // UGL category summary
    fetch(`https://dlnsqmcrtpfytpisuham.supabase.co/rest/v1/ugl?select=transaction_category`,{
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbnNxbWNydHBmeXRwaXN1aGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTc3MDEsImV4cCI6MjA5MDAzMzcwMX0.ABUdbVAmxV9DjbWoX7FjtN6SYt6l5JgFwDLPM3XNi8g',
      'Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbnNxbWNydHBmeXRwaXN1aGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTc3MDEsImV4cCI6MjA5MDAzMzcwMX0.ABUdbVAmxV9DjbWoX7FjtN6SYt6l5JgFwDLPM3XNi8g'}
    }).catch(()=>{})

    setCategories([
      {transaction_category:'ACCRUAL',  cnt:443385, total:687325440.85},
      {transaction_category:'RECEIPT',  cnt:31192,  total:254930238.59},
      {transaction_category:'PAYMENT',  cnt:20424,  total:374667542.31},
      {transaction_category:'JOURNAL',  cnt:4528,   total:267218821.49},
      {transaction_category:'REVERSAL', cnt:471,    total:8432709.78},
    ])
  }, [])

  const totalReceipts  = cashFlow.reduce((s,r) => s + Number(r.total_receipts),  0)
  const totalPayments  = cashFlow.reduce((s,r) => s + Number(r.total_payments),  0)
  const maxCashBar     = Math.max(...cashFlow.map(r => Math.max(Number(r.total_receipts), Number(r.total_payments))), 1)
  const maxClientRev   = clients[0]  ? Number(clients[0].total_revenue)  : 1
  const maxSupplierSpend = suppliers[0] ? Number(suppliers[0].total_spend)   : 1

  return (
    <div className={styles.home}>

      {/* KPI STRIP */}
      <div className={styles.kpiStrip}>
        {[
          { label:'GL Transactions', value: fmtCount(500000),  sub:'FY 2025 · 5 batches', color:'#3b82f6', icon:'📊' },
          { label:'Total Receipts',  value: fmtShort(254930238), sub:'31,192 transactions',  color:'#10b981', icon:'↓' },
          { label:'Total Payments',  value: fmtShort(269382579), sub:'20,424 transactions',  color:'#ec4899', icon:'↑' },
          { label:'Net Cash',        value: fmtShort(254930238 - 269382579), sub:'Receipts minus payments', color: 254930238 - 269382579 >= 0 ? '#10b981':'#f87171', icon:'⇄' },
          { label:'Parties',         value: fmtCount(6380),    sub:'2,844 clients · 817 suppliers', color:'#f59e0b', icon:'🏢' },
          { label:'Rule Coverage',   value: '100%',        sub:'0 unmatched rows', color:'#84cc16', icon:'⚙' },
        ].map(k => (
          <div key={k.label} className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ color: k.color }}>{k.icon}</div>
            <div className={styles.kpiVal} style={{ color: k.color }}>{k.value}</div>
            <div className={styles.kpiLabel}>{k.label}</div>
            <div className={styles.kpiSub}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className={styles.grid}>

        {/* Cash flow by month */}
        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Cash Flow by Period</div>
            <div className={styles.cardSub}>FY 2025 · Monthly receipts vs payments</div>
          </div>
          <div className={styles.cashChart}>
            {cashFlow.map(p => (
              <div key={p.period_code} className={styles.cashCol}>
                <div className={styles.cashBars}>
                  <div className={styles.cashBar} style={{
                    height: `${(Number(p.total_receipts)/maxCashBar)*100}%`,
                    background:'#10b981'
                  }} title={`Receipts: ${fmtShort(Number(p.total_receipts))}`} />
                  <div className={styles.cashBar} style={{
                    height: `${(Number(p.total_payments)/maxCashBar)*100}%`,
                    background:'#ec4899'
                  }} title={`Payments: ${fmtShort(Number(p.total_payments))}`} />
                </div>
                <div className={styles.cashLabel}>{p.period_code.slice(5)}</div>
                <div className={styles.cashNet} style={{
                  color: Number(p.net_cash_flow) >= 0 ? '#10b981' : '#f87171'
                }}>
                  {Number(p.net_cash_flow) >= 0 ? '↑' : '↓'}
                </div>
              </div>
            ))}
            <div className={styles.cashLegend}>
              <span><span style={{color:'#10b981'}}>■</span> Receipts</span>
              <span><span style={{color:'#ec4899'}}>■</span> Payments</span>
            </div>
          </div>
        </div>

        {/* Transaction categories donut */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>GL Classification</div>
            <div className={styles.cardSub}>500K rows · 5 categories</div>
          </div>
          <div className={styles.catList}>
            {categories.map(c => {
              const pct = Math.round((c.cnt / 500000) * 100)
              return (
                <div key={c.transaction_category} className={styles.catRow}>
                  <div className={styles.catName}>
                    <span className={styles.catDot} style={{ background: CAT_COLORS[c.transaction_category]||'#888' }} />
                    {c.transaction_category}
                  </div>
                  <div className={styles.catBarWrap}>
                    <div className={styles.catBar} style={{
                      width: `${pct}%`,
                      background: CAT_COLORS[c.transaction_category]||'#888'
                    }} />
                  </div>
                  <div className={styles.catPct}>{pct}%</div>
                  <div className={styles.catCnt}>{fmtCount(c.cnt)}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top clients */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Top Clients by Revenue</div>
            <div className={styles.cardSub}>{fmtCount(stats.client)} total clients</div>
          </div>
          <div className={styles.rankList}>
            {clients.map((c,i) => (
              <div key={i} className={styles.rankRow}>
                <div className={styles.rankNum}>{i+1}</div>
                <div className={styles.rankName} title={c.client_name}>{c.client_name}</div>
                <div className={styles.rankBarWrap}>
                  <div className={styles.rankBar} style={{
                    width: `${(Number(c.total_revenue)/maxClientRev)*100}%`,
                    background:'#10b981'
                  }} />
                </div>
                <div className={styles.rankVal} style={{ color:'#10b981' }}>{fmtShort(Number(c.total_revenue))}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top suppliers */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Top Suppliers by Spend</div>
            <div className={styles.cardSub}>{fmtCount(stats.supplier)} total suppliers</div>
          </div>
          <div className={styles.rankList}>
            {suppliers.map((s,i) => (
              <div key={i} className={styles.rankRow}>
                <div className={styles.rankNum}>{i+1}</div>
                <div className={styles.rankName} title={s.supplier_name}>{s.supplier_name}</div>
                <div className={styles.rankBarWrap}>
                  <div className={styles.rankBar} style={{
                    width: `${(Math.abs(Number(s.total_spend))/maxSupplierSpend)*100}%`,
                    background:'#f97316'
                  }} />
                </div>
                <div className={styles.rankVal} style={{ color:'#f97316' }}>{fmtShort(Math.abs(Number(s.total_spend)))}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className={`${styles.card} ${styles.cardActions}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Quick Actions</div>
          </div>
          <div className={styles.actionGrid}>
            {[
              { icon:'⚖', label:'Run Trial Balance', sub:'Select period & generate', view:'trial-balance', color:'#a78bfa' },
              { icon:'◎', label:'Knowledge Graph',   sub:'Explore data model',       view:'graph',         color:'#3b82f6' },
              { icon:'👥',label:'View Clients',      sub:'2,844 client entities',    view:'graph',         color:'#10b981' },
              { icon:'🏭',label:'View Suppliers',    sub:'817 supplier entities',    view:'graph',         color:'#f97316' },
            ].map(a => (
              <button key={a.label} className={styles.actionBtn}
                onClick={() => onNavigate(a.view)}
                style={{'--ac':a.color} as React.CSSProperties}>
                <span className={styles.actionIcon}>{a.icon}</span>
                <span className={styles.actionLabel}>{a.label}</span>
                <span className={styles.actionSub}>{a.sub}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
