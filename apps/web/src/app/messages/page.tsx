import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import CommunicationSystem from '@/components/communication-system'

export default async function MessagesPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return (
    <main className="min-h-screen p-8">
      <Suspense fallback={<div>Chargement...</div>}>
        <CommunicationSystem />
      </Suspense>
    </main>
  )
}
