import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all summary stats server-side
  const [
    { count: glCount },
    { count: coaCount },
    { count: periodCount },
    { count: partyCount },
    { count: clientCount },
    { count: supplierCount },
    { count: uglCount },
    { count: paymentCount },
    { count: ruleCount },
  ] = await Promise.all([
    supabase.from('gl_transactions').select('*', { count: 'exact', head: true }),
    supabase.from('chart_of_accounts').select('*', { count: 'exact', head: true }),
    supabase.from('accounting_periods').select('*', { count: 'exact', head: true }),
    supabase.from('parties').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('suppliers').select('*', { count: 'exact', head: true }),
    supabase.from('ugl').select('*', { count: 'exact', head: true }),
    supabase.from('payments').select('*', { count: 'exact', head: true }),
    supabase.from('gl_rules').select('*', { count: 'exact', head: true }),
  ])

  const stats = {
    gl: glCount ?? 0, coa: coaCount ?? 0, period: periodCount ?? 0,
    party: partyCount ?? 0, client: clientCount ?? 0, supplier: supplierCount ?? 0,
    ugl: uglCount ?? 0, payment: paymentCount ?? 0, rule: ruleCount ?? 0,
  }

  const profile = {
    email: user.email ?? '',
    name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
  }

  return <DashboardClient stats={stats} profile={profile} />
}
