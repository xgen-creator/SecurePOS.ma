import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { TagManagement } from '@/components/tag-management'

export default async function TagsPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return (
    <main className="min-h-screen p-8">
      <Suspense fallback={<div>Chargement...</div>}>
        <TagManagement user={user} />
      </Suspense>
    </main>
  )
}
