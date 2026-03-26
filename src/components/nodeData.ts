export type NodeId = 'gl'|'coa'|'period'|'party'|'client'|'supplier'|'ugl'|'payment'|'rule'

export interface NodeDef {
  id: NodeId
  label: string
  icon: string
  color: string
  group: 'source'|'dimension'|'party'|'derived'
  desc: string
  fields: string[]
  links: string[]
  sqlQuery?: string  // query to run when node is selected
}

export const NODE_COLORS: Record<NodeId, string> = {
  gl:       '#3b82f6',
  coa:      '#8b5cf6',
  period:   '#06b6d4',
  party:    '#f59e0b',
  client:   '#10b981',
  supplier: '#f97316',
  ugl:      '#a78bfa',
  payment:  '#ec4899',
  rule:     '#84cc16',
}

export const NODE_POSITIONS: Record<NodeId, { x: number; y: number }> = {
  gl:       { x:   0,  y:   0 },
  coa:      { x:-260,  y:-170 },
  period:   { x: 260,  y:-170 },
  party:    { x:   0,  y:-220 },
  client:   { x:-220,  y: 130 },
  supplier: { x: 220,  y: 130 },
  ugl:      { x:-110,  y: 230 },
  payment:  { x: 110,  y: 230 },
  rule:     { x: 300,  y:  50 },
}

export const NODE_RADIUS: Record<NodeId, number> = {
  gl:52, coa:40, period:36, party:44, client:42, supplier:38, ugl:48, payment:42, rule:32,
}

export const EDGES = [
  { from:'gl' as NodeId,      to:'coa' as NodeId,      label:'account_number',    type:'fk' },
  { from:'gl' as NodeId,      to:'period' as NodeId,   label:'period_id',         type:'fk' },
  { from:'gl' as NodeId,      to:'party' as NodeId,    label:'party_id',          type:'fk' },
  { from:'gl' as NodeId,      to:'client' as NodeId,   label:'client_id',         type:'fk' },
  { from:'gl' as NodeId,      to:'supplier' as NodeId, label:'supplier_id',       type:'fk' },
  { from:'party' as NodeId,   to:'client' as NodeId,   label:'party_type=CLIENT', type:'derived' },
  { from:'party' as NodeId,   to:'supplier' as NodeId, label:'party_type=SUPPLIER',type:'derived' },
  { from:'gl' as NodeId,      to:'ugl' as NodeId,      label:'trigger on insert', type:'trigger' },
  { from:'rule' as NodeId,    to:'ugl' as NodeId,      label:'rule match',        type:'rule' },
  { from:'ugl' as NodeId,     to:'payment' as NodeId,  label:'PAYMENT/RECEIPT',   type:'trigger' },
  { from:'payment' as NodeId, to:'client' as NodeId,   label:'payor_client_id',   type:'fk' },
  { from:'payment' as NodeId, to:'supplier' as NodeId, label:'payee_supplier_id', type:'fk' },
  { from:'payment' as NodeId, to:'period' as NodeId,   label:'period_id',         type:'fk' },
  { from:'ugl' as NodeId,     to:'coa' as NodeId,      label:'account_number',    type:'fk' },
  { from:'ugl' as NodeId,     to:'period' as NodeId,   label:'period_id',         type:'fk' },
  { from:'ugl' as NodeId,     to:'client' as NodeId,   label:'client_id',         type:'fk' },
  { from:'ugl' as NodeId,     to:'supplier' as NodeId, label:'supplier_id',       type:'fk' },
]

export const VIEW_SETS: Record<string, NodeId[]> = {
  all:        ['gl','coa','period','party','client','supplier','ugl','payment','rule'],
  dimensions: ['gl','coa','period'],
  party:      ['gl','party','client','supplier'],
  derived:    ['gl','ugl','payment','rule'],
  flow:       ['gl','coa','period','ugl','payment','rule'],
}

// Supabase queries to run per node (returns rows for detail view)
export const NODE_QUERIES: Record<NodeId, { table: string; select: string; limit: number; order?: string }> = {
  gl:       { table:'gl_transactions',   select:'row_id,account_number,transaction_date,amount,transaction_type,document_type,comments', limit:20, order:'row_id.desc' },
  coa:      { table:'chart_of_accounts', select:'account_number,account_name,account_category,normal_balance', limit:51 },
  period:   { table:'accounting_periods',select:'period_code,period_name,fiscal_year,start_date,end_date,is_closed', limit:12, order:'period_code.asc' },
  party:    { table:'parties',           select:'party_id,party_name,party_type,total_transaction_amount,transaction_count', limit:20, order:'transaction_count.desc' },
  client:   { table:'clients',           select:'client_id,client_name,total_revenue,transaction_count,first_seen_date,last_seen_date', limit:20, order:'total_revenue.desc' },
  supplier: { table:'suppliers',         select:'supplier_id,supplier_name,total_spend,transaction_count,first_seen_date', limit:20, order:'total_spend.asc' },
  ugl:      { table:'ugl',               select:'ugl_id,transaction_date,transaction_category,transaction_subcategory,amount,document_type,is_validated', limit:20, order:'ugl_id.desc' },
  payment:  { table:'payments',          select:'payment_id,payment_date,payor_name,payee_name,amount,transaction_type,payment_method', limit:20, order:'payment_id.desc' },
  rule:     { table:'gl_rules',          select:'rule_id,rule_name,document_type,amount_sign,transaction_category,transaction_subcategory,priority,is_active', limit:28, order:'priority.asc' },
}
