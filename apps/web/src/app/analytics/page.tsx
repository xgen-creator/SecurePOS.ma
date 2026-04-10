import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import DetailedStatistics from '@/components/detailed-statistics'

export default async function AnalyticsPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return (
    <main className="min-h-screen p-8">
      <Suspense fallback={<div>Chargement...</div>}>
        <DetailedStatistics />
      </Suspense>
    </main>
  )
}
