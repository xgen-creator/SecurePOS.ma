import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import AdminInterface from '@/components/admin-interface'

export default async function AdminPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  // Check if user is admin
  if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
    redirect('/')
  }
  
  return (
    <main className="min-h-screen p-8">
      <Suspense fallback={<div>Chargement...</div>}>
        <AdminInterface user={user} />
      </Suspense>
    </main>
  )
}
