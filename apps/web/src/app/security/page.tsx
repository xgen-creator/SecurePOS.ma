import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import SecurityDashboard from '@/components/security-dashboard'

export default async function SecurityPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return (
    <main className="min-h-screen p-8">
      <Suspense fallback={<div>Chargement...</div>}>
        <SecurityDashboard user={user} />
      </Suspense>
    </main>
  )
}
