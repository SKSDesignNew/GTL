'use client'
import { useEffect, useRef, useCallback } from 'react'
import { NODE_COLORS, NODE_POSITIONS, NODE_RADIUS, EDGES, VIEW_SETS } from './nodeData'
import type { NodeId } from './nodeData'

interface Props {
  stats: Record<string, number>
  selectedNode: NodeId | null
  activeView: string
  onSelectNode: (id: NodeId | null) => void
}

const NODE_ICONS: Record<NodeId, string> = {
  gl:'📊', coa:'📋', period:'📅', party:'🏢', client:'👥', supplier:'🏭', ugl:'✦', payment:'💳', rule:'⚙',
}

function fmt(n: number): string {
  if (n >= 1000000) return (n/1000000).toFixed(1)+'M'
  if (n >= 1000)    return (n/1000).toFixed(0)+'K'
  return n.toString()
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}

export default function KnowledgeGraph({ stats, selectedNode, activeView, onSelectNode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    scale: 1, offsetX: 0, offsetY: 0,
    dragging: false, lastX: 0, lastY: 0,
    hovered: null as NodeId | null,
    animFrame: 0,
    W: 0, H: 0,
  })
  const animRef = useRef<number>(0)

  const visibleNodes = new Set<NodeId>(VIEW_SETS[activeView] || VIEW_SETS.all)

  function resize() {
    const canvas = canvasRef.current
    if (!canvas) return
    const wrap = canvas.parentElement!
    const r = wrap.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width  = r.width  * dpr
    canvas.height = r.height * dpr
    canvas.style.width  = r.width  + 'px'
    canvas.style.height = r.height + 'px'
    stateRef.current.W = r.width
    stateRef.current.H = r.height
  }

  function worldToScreen(wx: number, wy: number) {
    const { scale, offsetX, offsetY, W, H } = stateRef.current
    return { x: wx * scale + W/2 + offsetX, y: wy * scale + H/2 + offsetY }
  }

  function screenToWorld(sx: number, sy: number) {
    const { scale, offsetX, offsetY, W, H } = stateRef.current
    return { x: (sx - W/2 - offsetX) / scale, y: (sy - H/2 - offsetY) / scale }
  }

  function getNodeAt(mx: number, my: number): NodeId | null {
    for (const id of Object.keys(NODE_POSITIONS) as NodeId[]) {
      if (!visibleNodes.has(id)) continue
      const { x, y } = worldToScreen(NODE_POSITIONS[id].x, NODE_POSITIONS[id].y)
      const r = NODE_RADIUS[id] * stateRef.current.scale + 8
      if ((mx-x)**2 + (my-y)**2 <= r*r) return id
    }
    return null
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const { W, H, scale, offsetX, offsetY, hovered, animFrame } = stateRef.current

    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.025)'
    ctx.lineWidth = 0.5
    const step = 40 * scale
    const ox = (W/2 + offsetX) % step, oy = (H/2 + offsetY) % step
    for (let x = ox; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
    for (let y = oy; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

    // Edges
    for (const edge of EDGES) {
      if (!visibleNodes.has(edge.from) || !visibleNodes.has(edge.to)) continue
      const s = worldToScreen(NODE_POSITIONS[edge.from].x, NODE_POSITIONS[edge.from].y)
      const e = worldToScreen(NODE_POSITIONS[edge.to].x,   NODE_POSITIONS[edge.to].y)
      const r1 = NODE_RADIUS[edge.from] * scale
      const r2 = NODE_RADIUS[edge.to]   * scale
      const dx = e.x - s.x, dy = e.y - s.y
      const dist = Math.sqrt(dx*dx+dy*dy)
      if (dist < 1) continue
      const ux = dx/dist, uy = dy/dist
      const sx2 = s.x+ux*r1, sy2 = s.y+uy*r1
      const ex2 = e.x-ux*r2, ey2 = e.y-uy*r2

      const isHi = selectedNode && (edge.from===selectedNode || edge.to===selectedNode)
      const alpha = selectedNode ? (isHi ? 0.85 : 0.06) : 0.28
      const colors: Record<string,string> = { fk:'#3b82f6', derived:'#f59e0b', trigger:'#a78bfa', rule:'#84cc16' }
      const col = colors[edge.type] || '#888'

      const mx2 = (sx2+ex2)/2 - uy*28*scale, my2 = (sy2+ey2)/2 + ux*28*scale

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = col
      ctx.lineWidth = isHi ? 1.5 : 0.8
      if (edge.type === 'trigger') ctx.setLineDash([4*scale, 4*scale])
      ctx.beginPath(); ctx.moveTo(sx2,sy2); ctx.quadraticCurveTo(mx2,my2,ex2,ey2); ctx.stroke()
      ctx.setLineDash([])

      // Arrowhead
      const t = 0.88
      const qx = (1-t)**2*sx2 + 2*(1-t)*t*mx2 + t**2*ex2
      const qy = (1-t)**2*sy2 + 2*(1-t)*t*my2 + t**2*ey2
      const angle = Math.atan2(ey2-qy, ex2-qx)
      const as = 6*scale
      ctx.beginPath(); ctx.fillStyle = col
      ctx.moveTo(ex2, ey2)
      ctx.lineTo(ex2-as*Math.cos(angle-0.4), ey2-as*Math.sin(angle-0.4))
      ctx.lineTo(ex2-as*Math.cos(angle+0.4), ey2-as*Math.sin(angle+0.4))
      ctx.closePath(); ctx.fill()
      ctx.restore()
    }

    // Nodes
    for (const id of Object.keys(NODE_POSITIONS) as NodeId[]) {
      if (!visibleNodes.has(id)) continue
      const { x: sx3, y: sy3 } = worldToScreen(NODE_POSITIONS[id].x, NODE_POSITIONS[id].y)
      const r = NODE_RADIUS[id] * scale
      const col = NODE_COLORS[id]
      const rgb = hexToRgb(col)
      const isHov = hovered === id
      const isSel = selectedNode === id
      const isDim = selectedNode && !isSel &&
        !EDGES.some(e => (e.from===selectedNode&&e.to===id)||(e.to===selectedNode&&e.from===id))

      ctx.save()
      ctx.globalAlpha = isDim ? 0.2 : 1

      // Glow
      if (isSel || isHov) {
        const grd = ctx.createRadialGradient(sx3,sy3,r*0.4,sx3,sy3,r*2.5)
        grd.addColorStop(0, `rgba(${rgb},0.2)`)
        grd.addColorStop(1, `rgba(${rgb},0)`)
        ctx.beginPath(); ctx.arc(sx3,sy3,r*2.5,0,Math.PI*2)
        ctx.fillStyle = grd; ctx.fill()
      }

      // Pulse ring
      if (isSel) {
        const pulse = (Math.sin(animFrame*0.05)+1)*0.5
        ctx.beginPath(); ctx.arc(sx3,sy3,r+6*scale+pulse*5*scale,0,Math.PI*2)
        ctx.strokeStyle = `rgba(${rgb},0.45)`; ctx.lineWidth = 1.5; ctx.stroke()
      }

      // Fill
      const grd2 = ctx.createRadialGradient(sx3-r*0.25,sy3-r*0.25,r*0.05,sx3,sy3,r)
      grd2.addColorStop(0, `rgba(${rgb},0.38)`)
      grd2.addColorStop(1, `rgba(${rgb},0.1)`)
      ctx.beginPath(); ctx.arc(sx3,sy3,r,0,Math.PI*2)
      ctx.fillStyle = grd2; ctx.fill()
      ctx.strokeStyle = isSel ? col : `rgba(${rgb},0.55)`
      ctx.lineWidth = isSel ? 2 : 0.8; ctx.stroke()

      // Icon
      const iconSize = Math.round(r * 0.55)
      ctx.font = `${iconSize}px serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.globalAlpha = isDim ? 0.2 : 0.9
      ctx.fillText(NODE_ICONS[id], sx3, sy3 - r*0.1)

      // Count
      const countStr = fmt(stats[id] ?? 0)
      ctx.font = `600 ${Math.round(8.5*scale)}px 'IBM Plex Mono'`
      ctx.fillStyle = col; ctx.globalAlpha = isDim ? 0.18 : 0.8
      ctx.fillText(countStr, sx3, sy3 + r*0.44)

      // Label
      ctx.font = `500 ${Math.round(10.5*scale)}px 'IBM Plex Sans'`
      ctx.fillStyle = isSel ? '#fff' : '#cbd5e1'
      ctx.globalAlpha = isDim ? 0.18 : 1
      ctx.fillText(id === 'ugl' ? 'Universal GL' : id === 'coa' ? 'Chart of Accts' : id.charAt(0).toUpperCase()+id.slice(1), sx3, sy3+r+13*scale)

      ctx.restore()
    }

    ctx.restore()
  }, [selectedNode, activeView, stats])

  useEffect(() => {
    function loop() {
      stateRef.current.animFrame++
      draw()
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [draw])

  useEffect(() => {
    resize()
    window.addEventListener('resize', () => { resize(); draw() })
    return () => window.removeEventListener('resize', resize)
  }, [])

  function onMouseMove(e: React.MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const s = stateRef.current
    if (s.dragging) {
      s.offsetX += e.clientX - s.lastX
      s.offsetY += e.clientY - s.lastY
      s.lastX = e.clientX; s.lastY = e.clientY
    } else {
      s.hovered = getNodeAt(mx, my)
    }
  }
  function onMouseDown(e: React.MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const hit = getNodeAt(e.clientX - rect.left, e.clientY - rect.top)
    if (!hit) { stateRef.current.dragging = true; stateRef.current.lastX = e.clientX; stateRef.current.lastY = e.clientY }
  }
  function onMouseUp() { stateRef.current.dragging = false }
  function onClick(e: React.MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const hit = getNodeAt(e.clientX - rect.left, e.clientY - rect.top)
    onSelectNode(hit === selectedNode ? null : hit)
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const s = stateRef.current
    const factor = e.deltaY < 0 ? 1.12 : 0.9
    const wBefore = screenToWorld(mx, my)
    s.scale = Math.max(0.3, Math.min(3.5, s.scale * factor))
    const wAfter = screenToWorld(mx, my)
    s.offsetX += (wAfter.x - wBefore.x) * s.scale
    s.offsetY += (wAfter.y - wBefore.y) * s.scale
  }

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden',
      background:'radial-gradient(ellipse 70% 50% at 30% 30%, rgba(59,130,246,0.04) 0%,transparent 70%),' +
      'radial-gradient(ellipse 60% 50% at 70% 70%, rgba(139,92,246,0.04) 0%,transparent 70%)' }}>
      <canvas ref={canvasRef}
        style={{ display:'block', width:'100%', height:'100%',
          cursor: stateRef.current.hovered ? 'pointer' : 'grab' }}
        onMouseMove={onMouseMove} onMouseDown={onMouseDown}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onClick={onClick} onWheel={onWheel} />
      <div style={{ position:'absolute', bottom:16, right:16, display:'flex', flexDirection:'column', gap:4 }}>
        {[['＋',1.2],['－',0.8],['⊙','reset']].map(([lbl,act]) => (
          <button key={String(lbl)} onClick={() => {
            if (act === 'reset') { stateRef.current.scale=1; stateRef.current.offsetX=0; stateRef.current.offsetY=0; onSelectNode(null) }
            else stateRef.current.scale = Math.max(0.3, Math.min(3.5, stateRef.current.scale * (act as number)))
          }} style={{ width:32,height:32,background:'#0f1117',border:'1px solid rgba(255,255,255,0.14)',
            borderRadius:6,color:'#e2e8f0',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center' }}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{ position:'absolute',bottom:16,left:16,fontSize:10,color:'#334155',fontFamily:'IBM Plex Mono' }}>
        drag · scroll · click to explore
      </div>
      {/* Persistent mini legend */}
      <div style={{
        position:'absolute', top:14, right:14,
        background:'rgba(15,17,23,0.85)', border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:8, padding:'8px 10px', backdropFilter:'blur(8px)',
        display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 14px'
      }}>
        {([
          ['GL Transactions','#3b82f6'],['Chart of Accts','#8b5cf6'],
          ['Acct. Periods','#06b6d4'],['Parties','#f59e0b'],
          ['Clients','#10b981'],['Suppliers','#f97316'],
          ['Universal GL','#a78bfa'],['Payments','#ec4899'],
          ['GL Rules','#84cc16'],
        ] as [string,string][]).map(([label, color]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:color, flexShrink:0 }} />
            <span style={{ fontSize:9, color:'#94a3b8', whiteSpace:'nowrap' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
