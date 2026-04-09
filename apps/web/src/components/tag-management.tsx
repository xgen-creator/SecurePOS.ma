'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

interface Tag {
  id: string
  tag_code: string
  name: string
  is_active: boolean
  scan_count: number
  property_id: string
}

interface TagManagementProps {
  user: {
    id: string
    email: string
    role: string
  }
}

export function TagManagement({ user }: TagManagementProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTags()
  }, [])

  async function loadTags() {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('created_at', { ascending: false })

    setTags(data || [])
    setLoading(false)
  }

  if (loading) {
    return <div>Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestion des Tags</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + Nouveau Tag
        </button>
      </div>

      <div className="grid gap-4">
        {tags.map((tag) => (
          <div key={tag.id} className="p-4 border rounded-lg flex items-center justify-between">
            <div>
              <h3 className="font-medium">{tag.name}</h3>
              <p className="text-sm text-gray-500">Code: {tag.tag_code}</p>
              <p className="text-sm text-gray-500">Scans: {tag.scan_count}</p>
            </div>
            <span className={`px-2 py-1 rounded text-sm ${
              tag.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {tag.is_active ? 'Actif' : 'Inactif'}
            </span>
          </div>
        ))}

        {tags.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun tag créé. Cliquez sur "Nouveau Tag" pour commencer.
          </div>
        )}
      </div>
    </div>
  )
}
