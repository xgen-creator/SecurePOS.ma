import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import EventHistory from '@/components/event-history'
import VisitHistory from '@/components/visit-history'

export default async function HistoryPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return (
    <main className="min-h-screen p-8 space-y-8">
      <Suspense fallback={<div>Chargement...</div>}>
        <EventHistory />
        <VisitHistory />
      </Suspense>
    </main>
  )
}
