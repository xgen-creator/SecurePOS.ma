import { Suspense } from 'react'
import { Dashboard } from '@/components/dashboard'
import { getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return (
    <main className="min-h-screen p-8">
      <Suspense fallback={<div>Chargement...</div>}>
        <Dashboard user={user} />
      </Suspense>
    </main>
  )
}
