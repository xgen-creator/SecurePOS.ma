import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import SystemConfig from '@/components/system-config'

export default async function DeviceSettingsPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return (
    <main className="min-h-screen p-8">
      <Suspense fallback={<div>Chargement...</div>}>
        <SystemConfig />
      </Suspense>
    </main>
  )
}
