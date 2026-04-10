import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import DeliveryManagement from '@/components/delivery-management'

export default async function DeliveriesPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return (
    <main className="min-h-screen p-8">
      <Suspense fallback={<div>Chargement...</div>}>
        <DeliveryManagement />
      </Suspense>
    </main>
  )
}
