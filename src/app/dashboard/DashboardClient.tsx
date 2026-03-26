'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import styles from './dashboard.module.css'
import KnowledgeGraph from '@/components/KnowledgeGraph'
import DetailPanel from '@/components/DetailPanel'
import TrialBalance from '@/components/TrialBalance'
import DashboardHome from '@/components/DashboardHome'
import ChatPanel from '@/components/ChatPanel'
import UserMenu from '@/components/UserMenu'
import AuditRiskDashboard from '@/components/AuditRiskDashboard'
import JETesting from '@/components/JETesting'
import BenfordsLaw from '@/components/BenfordsLaw'
import UserActivityAudit from '@/components/UserActivityAudit'
import VarianceAnalysis from '@/components/VarianceAnalysis'
import CutoffTesting from '@/components/CutoffTesting'
import type { NodeId } from '@/components/nodeData'
import { fmtCount } from '@/lib/fmt'

interface Props {
  stats: Record<string, number>
  profile: { email: string; name: string }
}

const ALL_NODES = [
  { id:'gl'       as NodeId, label:'GL Transactions',   color:'#3b82f6', group:'Source' },
  { id:'coa'      as NodeId, label:'Chart of Accounts', color:'#8b5cf6', group:'Dimensions' },
  { id:'period'   as NodeId, label:'Acct. Periods',     color:'#06b6d4', group:'Dimensions' },
  { id:'party'    as NodeId, label:'Parties',           color:'#f59e0b', group:'Party Master' },
  { id:'client'   as NodeId, label:'Clients',           color:'#10b981', group:'Party Master' },
  { id:'supplier' as NodeId, label:'Suppliers',         color:'#f97316', group:'Party Master' },
  { id:'ugl'      as NodeId, label:'Universal GL',      color:'#a78bfa', group:'Derived' },
  { id:'payment'  as NodeId, label:'Payments',          color:'#ec4899', group:'Derived' },
  { id:'rule'     as NodeId, label:'GL Rules',          color:'#84cc16', group:'Derived' },
]
const GROUPS = ['Source','Dimensions','Party Master','Derived']
const VIEWS  = [
  { v:'all',        l:'All nodes' },
  { v:'dimensions', l:'Dimensions' },
  { v:'party',      l:'Party graph' },
  { v:'derived',    l:'Derived tables' },
  { v:'flow',       l:'Data flow' },
]

type PanelMode = 'normal'|'expanded'|'fullscreen'
type MainView  = 'home'|'graph'|'trial-balance'|'audit-risk'|'je-testing'|'benfords'|'user-activity'|'variance'|'cutoff'
const DEFAULT_WIDTH = 300

export default function DashboardClient({ stats, profile }: Props) {
  const [selectedNode, setSelectedNode]   = useState<NodeId|null>(null)
  const [activeView, setActiveView]       = useState('all')
  const [mainView, setMainView]           = useState<MainView>('home')
  const [panelWidth, setPanelWidth]       = useState(DEFAULT_WIDTH)
  const [panelMode, setPanelMode]         = useState<PanelMode>('normal')
  const [search, setSearch]               = useState('')
  const [searchResults, setSearchResults] = useState<{type:string;name:string}[]>([])
  const [searchOpen, setSearchOpen]       = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [chatOpen, setChatOpen]             = useState(false)
  const [highlightedNodes, setHighlightedNodes] = useState<NodeId[]>([])

  const bodyRef   = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const isResizing  = useRef(false)
  const startX      = useRef(0)
  const startWidth  = useRef(0)

  const router = useRouter()
  const sb = createClient()

  async function signOut() {
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Global search with 250ms debounce
  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      const [c, s, a] = await Promise.all([
        sb.from('clients').select('client_name').ilike('client_name',`%${search}%`).limit(4),
        sb.from('suppliers').select('supplier_name').ilike('supplier_name',`%${search}%`).limit(4),
        sb.from('chart_of_accounts').select('account_number,account_name').ilike('account_name',`%${search}%`).limit(3),
      ])
      const results: {type:string;name:string;node:NodeId}[] = []
      c.data?.forEach(r => results.push({type:'Client',   name:r.client_name,                             node:'client'}))
      s.data?.forEach(r => results.push({type:'Supplier', name:r.supplier_name,                           node:'supplier'}))
      a.data?.forEach(r => results.push({type:'Account',  name:`${r.account_number} · ${r.account_name}`, node:'coa'}))
      setSearchResults(results)
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  // Close search dropdown on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Drag resize
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (panelMode !== 'normal') return
    isResizing.current = true
    startX.current = e.clientX
    startWidth.current = panelWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [panelWidth, panelMode])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isResizing.current) return
      const delta = startX.current - e.clientX
      const bodyW = bodyRef.current?.offsetWidth ?? 1200
      setPanelWidth(Math.min(Math.max(240, startWidth.current + delta), bodyW - 440))
    }
    function onUp() {
      if (!isResizing.current) return
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  function cycleMode(m: PanelMode) { setPanelMode(p => p === m ? 'normal' : m) }

  function getPanelClass() {
    const base = styles.detail
    if (panelMode === 'fullscreen') return `${base} ${styles.detailFullscreen}`
    if (panelMode === 'expanded')   return `${base} ${styles.detailExpanded}`
    // On mobile, show bottom sheet when a node is selected
    return base
  }

  const isGraphMode = mainView === 'graph'

  return (
    <div className={styles.shell}>

      {/* ── HEADER ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {/* Mobile hamburger */}
          <button className={styles.mobileMenuBtn} onClick={() => setMobileNavOpen(o => !o)}>
            {mobileNavOpen ? '✕' : '☰'}
          </button>
          <div className={styles.logoMark}>AQ</div>
          <div>
            <div className={styles.logoText}>AuditQens</div>
            <div className={styles.logoSub}>FY 2025 · Jan–Dec · 12 periods</div>
          </div>
        </div>

        {/* Global search */}
        <div className={styles.searchWrap} ref={searchRef}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>⌕</span>
            <input className={styles.searchInput}
              placeholder="Search clients, suppliers, accounts…"
              value={search}
              onChange={e => { setSearch(e.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)} />
            {search && <button className={styles.searchClear} onClick={() => { setSearch(''); setSearchResults([]) }}>✕</button>}
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div className={styles.searchDropdown}>
              {(searchResults as {type:string;name:string;node:NodeId}[]).map((r,i) => (
                <div key={i} className={styles.searchResult} onClick={() => {
                  setSelectedNode(r.node); setMainView('graph')
                  setSearch(''); setSearchOpen(false); setMobileNavOpen(false)
                }}>
                  <span className={styles.searchResultType}>{r.type}</span>
                  <span className={styles.searchResultName}>{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* KPI stats — hidden on mobile */}
        <div className={styles.headerStats}>
          {[
            { v: fmtCount(stats.gl),      l:'GL Rows',  c:'#3b82f6' },
            { v: fmtCount(stats.coa),     l:'Accounts', c:'#8b5cf6' },
            { v: fmtCount(stats.party),   l:'Parties',  c:'#f59e0b' },
            { v: fmtCount(stats.payment), l:'Payments', c:'#ec4899' },
          ].map(s => (
            <div key={s.l} className={styles.hStat}>
              <div className={styles.hStatVal} style={{ color: s.c }}>{s.v}</div>
              <div className={styles.hStatLbl}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* User menu with dropdown + sign-out confirmation */}
        <div className={styles.headerRight}>
          <UserMenu name={profile.name} email={profile.email} onSignOut={signOut} />
        </div>
        {/* Chat toggle */}
        <button
          className={`${styles.chatToggleBtn} ${chatOpen ? styles.chatToggleActive : ''}`}
          onClick={() => setChatOpen(o => !o)}
          title="AI Chat"
        >
          <span className={styles.chatToggleIcon}>💬</span>
          <span>Ask AI</span>
          {!chatOpen && <span className={styles.chatTogglePulse} />}
        </button>
      </header>

      {/* Mobile sidebar overlay */}
      <div className={`${styles.mobileOverlay} ${mobileNavOpen ? styles.visible : ''}`}
        onClick={() => setMobileNavOpen(false)} />

      {/* ── BODY ── */}
      <div className={styles.body} ref={bodyRef}>

        {/* ── SIDEBAR ── */}
        <aside className={`${styles.sidebar} ${mobileNavOpen ? styles.mobileOpen : ''}`}>

          <div className={styles.sideTitle}>Navigate</div>
          <button className={`${styles.reportNavBtn} ${mainView==='home'?styles.reportNavActive:''}`}
            onClick={() => { setMainView('home'); setMobileNavOpen(false) }}>
            <span className={styles.reportNavIcon}>⬡</span>
            <span className={styles.reportNavLabel}>Dashboard</span>
          </button>
          <button className={`${styles.reportNavBtn} ${mainView==='graph'?styles.reportNavActive:''}`}
            onClick={() => { setMainView('graph'); setMobileNavOpen(false) }}>
            <span className={styles.reportNavIcon}>◎</span>
            <span className={styles.reportNavLabel}>Knowledge Graph</span>
          </button>

          <div className={styles.sideDivider} />

          <div className={styles.sideTitle}>Reports</div>
          <button className={`${styles.reportNavBtn} ${mainView==='trial-balance'?styles.reportNavActive:''}`}
            style={{'--nav-color':'#a78bfa'} as React.CSSProperties}
            onClick={() => { setMainView(mainView==='trial-balance'?'graph':'trial-balance'); setMobileNavOpen(false) }}>
            <span className={styles.reportNavIcon}>⚖</span>
            <span className={styles.reportNavLabel}>Trial Balance</span>
            {mainView==='trial-balance' && <span className={styles.reportNavBadge}>open</span>}
          </button>

          <div className={styles.sideDivider} />

          <div className={styles.sideTitle}>Audit Analytics</div>
          {[
            { id:'audit-risk'   as MainView, icon:'🛡', label:'Risk Dashboard',    color:'#ef4444' },
            { id:'je-testing'   as MainView, icon:'🔍', label:'JE Testing',        color:'#f59e0b' },
            { id:'benfords'     as MainView, icon:'📊', label:"Benford's Law",     color:'#10b981' },
            { id:'user-activity'as MainView, icon:'👤', label:'User Activity',     color:'#f97316' },
            { id:'variance'     as MainView, icon:'📈', label:'Variance Analysis', color:'#8b5cf6' },
            { id:'cutoff'       as MainView, icon:'✂', label:'Cut-off Testing',   color:'#06b6d4' },
          ].map(item => (
            <button key={item.id}
              className={`${styles.reportNavBtn} ${mainView===item.id?styles.reportNavActive:''}`}
              style={{'--nav-color':item.color} as React.CSSProperties}
              onClick={() => { setMainView(item.id); setMobileNavOpen(false) }}>
              <span className={styles.reportNavIcon}>{item.icon}</span>
              <span className={styles.reportNavLabel}>{item.label}</span>
            </button>
          ))}

          <div className={styles.sideDivider} />

          <div className={styles.sideTitle}>Exceptions</div>
          <div className={styles.exceptionsList}>
            {[
              { label:'Unmatched rules',  val:'0',     cls:styles.excGood },
              { label:'Unknown parties',  val:'18K',   cls:styles.excWarn },
              { label:'Void checks',      val:'93',    cls:styles.excWarn },
              { label:'Refunds',          val:'1,749', cls:styles.excInfo },
              { label:'Reversals',        val:'471',   cls:styles.excInfo },
            ].map(ex => (
              <div key={ex.label} className={`${styles.excItem} ${ex.cls}`}>
                <span className={styles.excDot}>●</span>
                <span className={styles.excLabel}>{ex.label}</span>
                <span className={styles.excVal}>{ex.val}</span>
              </div>
            ))}
          </div>

          {/* Graph controls — only when in graph mode */}
          {isGraphMode && (<>
            <div className={styles.sideDivider} />
            <div className={styles.sideTitle}>Node Types</div>
            {GROUPS.map(grp => (
              <div key={grp} className={styles.sideGroup}>
                <div className={styles.sideGroupTitle}>{grp}</div>
                {ALL_NODES.filter(n => n.group===grp).map(n => (
                  <button key={n.id}
                    className={`${styles.sideItem} ${selectedNode===n.id?styles.sideActive:''}`}
                    onClick={() => { setSelectedNode(selectedNode===n.id?null:n.id); setMobileNavOpen(false) }}>
                    <span className={styles.sideDot} style={{ background:n.color }} />
                    <span className={styles.sideLabel}>{n.label}</span>
                    <span className={styles.sideBadge}>{fmtCount(stats[n.id]??0)}</span>
                  </button>
                ))}
              </div>
            ))}
            <div className={styles.sideTitle} style={{ marginTop:16 }}>Views</div>
            {VIEWS.map(vw => (
              <button key={vw.v}
                className={`${styles.viewBtn} ${activeView===vw.v?styles.viewActive:''}`}
                onClick={() => { setActiveView(vw.v); setSelectedNode(null) }}>
                {vw.l}
              </button>
            ))}
          </>)}
        </aside>

        {/* ── CENTRE ── */}
        {mainView === 'home' ? (
          <main className={styles.canvas}>
            <DashboardHome stats={stats} onNavigate={(v) => setMainView(v as MainView)} />
          </main>
        ) : mainView === 'trial-balance' ? (
          <main className={styles.canvas}>
            <TrialBalance onClose={() => setMainView('graph')} />
          </main>
        ) : mainView === 'audit-risk' ? (
          <main className={styles.canvas} style={{overflowY:'auto'}}>
            <AuditRiskDashboard />
          </main>
        ) : mainView === 'je-testing' ? (
          <main className={styles.canvas}>
            <JETesting />
          </main>
        ) : mainView === 'benfords' ? (
          <main className={styles.canvas} style={{overflowY:'auto'}}>
            <BenfordsLaw />
          </main>
        ) : mainView === 'user-activity' ? (
          <main className={styles.canvas}>
            <UserActivityAudit />
          </main>
        ) : mainView === 'variance' ? (
          <main className={styles.canvas}>
            <VarianceAnalysis />
          </main>
        ) : mainView === 'cutoff' ? (
          <main className={styles.canvas}>
            <CutoffTesting />
          </main>
        ) : (
          <>
            <main className={styles.canvas}>
              <KnowledgeGraph stats={stats} selectedNode={selectedNode}
                activeView={activeView} onSelectNode={setSelectedNode} />
            </main>

            {/* Resize handle — desktop only */}
            {panelMode === 'normal' && (
              <div className={styles.resizeHandle} onMouseDown={onMouseDown} />
            )}

            {/* Detail panel — right panel on desktop, bottom sheet on mobile */}
            <aside className={getPanelClass()}
              style={panelMode !== 'normal' ? {} : { width: panelWidth }}>
              <div className={styles.detailHeader}>
                <div className={styles.sideTitle} style={{ margin:0 }}>Node Detail</div>
                <div className={styles.detailControls}>
                  {panelMode==='normal' && panelWidth!==DEFAULT_WIDTH && (
                    <button className={styles.detailCtrlBtn} title="Reset width"
                      onClick={() => setPanelWidth(DEFAULT_WIDTH)}>↔</button>
                  )}
                  <button className={`${styles.detailCtrlBtn} ${panelMode==='expanded'?styles.active:''}`}
                    onClick={() => cycleMode('expanded')} title={panelMode==='expanded'?'Restore':'Expand'}>
                    {panelMode==='expanded'?'⊟':'⊞'}
                  </button>
                  <button className={`${styles.detailCtrlBtn} ${panelMode==='fullscreen'?styles.active:''}`}
                    onClick={() => cycleMode('fullscreen')} title={panelMode==='fullscreen'?'Exit fullscreen':'Fullscreen'}>
                    {panelMode==='fullscreen'?'⊡':'⤢'}
                  </button>
                  {selectedNode && (
                    <button className={styles.detailCtrlBtn} title="Close"
                      onClick={() => { setSelectedNode(null); setPanelMode('normal') }}>✕</button>
                  )}
                </div>
              </div>
              <div className={styles.detailInner}>
                <DetailPanel nodeId={selectedNode} stats={stats} />
              </div>
            </aside>
          </>
        )}

        {/* CHAT PANEL */}
        <div className={`${styles.chatPanel} ${!chatOpen ? styles.chatPanelHidden : ''}`}>
          {chatOpen && (
            <ChatPanel
              onClose={() => setChatOpen(false)}
              onNodeHighlight={(nodes) => {
                setHighlightedNodes(nodes)
                if (nodes.length > 0) setMainView('graph')
                setTimeout(() => setHighlightedNodes([]), 3000)
              }}
              onNavigate={(view) => setMainView(view as MainView)}
            />
          )}
        </div>

      </div>
    </div>
  )
}
