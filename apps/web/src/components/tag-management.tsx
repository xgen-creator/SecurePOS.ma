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
  features: {
    video?: boolean
    audio?: boolean
    message?: boolean
    whatsapp?: boolean
  }
  latitude?: number
  longitude?: number
  geofencing_enabled?: boolean
}

interface TagManagementProps {
  user: {
    id: string
    email: string
    role: string
  }
}

interface WhatsAppStatus {
  configured: boolean
  verified: boolean
}

export function TagManagement({ user }: TagManagementProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [whatsAppStatus, setWhatsAppStatus] = useState<WhatsAppStatus | null>(null)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)

  useEffect(() => {
    loadTags()
    loadWhatsAppStatus()
  }, [])

  async function loadTags() {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data } = await supabase
      .from('tags')
      .select('id, tag_code, name, is_active, scan_count, property_id, features')
      .order('created_at', { ascending: false })

    setTags(data || [])
    setLoading(false)
  }

  async function loadWhatsAppStatus() {
    try {
      const response = await fetch('/api/whatsapp/status')
      if (response.ok) {
        const data = await response.json()
        setWhatsAppStatus(data)
      }
    } catch (err) {
      console.error('Error loading WhatsApp status:', err)
    }
  }

  async function updateTagFeatures(tagId: string, features: Tag['features']) {
    // Block enabling WhatsApp if not verified
    if (features.whatsapp && !whatsAppStatus?.verified) {
      alert('Vous devez d\'abord valider votre numéro WhatsApp dans les paramètres.')
      return
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase
      .from('tags')
      .update({ features })
      .eq('id', tagId)

    if (error) {
      console.error('Error updating tag:', error)
      alert('Erreur lors de la mise à jour')
      return
    }

    // Refresh tags
    loadTags()
    setEditingTag(null)
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
          <div key={tag.id} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium">{tag.name}</h3>
                <p className="text-sm text-gray-500">Code: {tag.tag_code}</p>
                <p className="text-sm text-gray-500">Scans: {tag.scan_count}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-sm ${
                  tag.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {tag.is_active ? 'Actif' : 'Inactif'}
                </span>
                <button
                  onClick={() => setEditingTag(tag)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Configurer
                </button>
              </div>
            </div>
            
            {/* Features indicators */}
            <div className="flex flex-wrap gap-2">
              {tag.features?.video && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Vidéo</span>
              )}
              {tag.features?.audio && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Audio</span>
              )}
              {tag.features?.message && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Message</span>
              )}
              {tag.features?.whatsapp && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                  </svg>
                  WhatsApp
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Edit Modal */}
        {editingTag && (
          <TagFeaturesModal
            tag={editingTag}
            whatsAppStatus={whatsAppStatus}
            onClose={() => setEditingTag(null)}
            onSave={updateTagFeatures}
          />
        )}

        {tags.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun tag créé. Cliquez sur "Nouveau Tag" pour commencer.
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Modal pour configurer les features d'un tag
 * Bloque l'activation de WhatsApp si le numéro n'est pas vérifié
 */
function TagFeaturesModal({ 
  tag, 
  whatsAppStatus, 
  onClose, 
  onSave 
}: { 
  tag: Tag
  whatsAppStatus: WhatsAppStatus | null
  onClose: () => void
  onSave: (tagId: string, features: Tag['features']) => void
}) {
  const [features, setFeatures] = useState(tag.features || {})
  const [showWhatsAppWarning, setShowWhatsAppWarning] = useState(false)
  
  // Geolocation state
  const [latitude, setLatitude] = useState(tag.latitude?.toString() || '')
  const [longitude, setLongitude] = useState(tag.longitude?.toString() || '')
  const [geofencingEnabled, setGeofencingEnabled] = useState(tag.geofencing_enabled !== false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  const handleWhatsAppToggle = (enabled: boolean) => {
    if (enabled && !whatsAppStatus?.verified) {
      setShowWhatsAppWarning(true)
      return
    }
    setFeatures(prev => ({ ...prev, whatsapp: enabled }))
    setShowWhatsAppWarning(false)
  }

  // Get current position using browser geolocation
  const handleGetCurrentPosition = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur.')
      return
    }

    setIsGettingLocation(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords
        setLatitude(lat.toFixed(8))
        setLongitude(lng.toFixed(8))
        setIsGettingLocation(false)
      },
      (error) => {
        setIsGettingLocation(false)
        console.error('Geolocation error:', error)
        
        if (error.code === error.PERMISSION_DENIED) {
          alert('Permission de géolocalisation refusée. Veuillez autoriser l\'accès à votre position dans les paramètres de votre navigateur.')
        } else {
          alert('Impossible d\'obtenir votre position. Veuillez vérifier que votre GPS est activé.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  // Enhanced save function that includes geolocation
  const handleSave = () => {
    const updatedFeatures = { ...features }
    
    // Update tag with geolocation data
    const updatedTag = {
      ...tag,
      features: updatedFeatures,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      geofencing_enabled: geofencingEnabled
    }
    
    // Call the parent's onSave with all data
    onSave(tag.id, updatedFeatures)
    
    // Also update geolocation separately via Supabase
    updateTagGeolocation()
  }

  const updateTagGeolocation = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase
      .from('tags')
      .update({
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        geofencing_enabled: geofencingEnabled
      })
      .eq('id', tag.id)

    if (error) {
      console.error('Error updating geolocation:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Configurer {tag.name}</h2>
        
        <p className="text-sm text-gray-600 mb-4">
          Activez les options de contact disponibles pour les visiteurs.
        </p>

        {/* WhatsApp Warning */}
        {showWhatsAppWarning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>WhatsApp non configuré</strong><br/>
              Vous devez d'abord valider votre numéro WhatsApp dans les paramètres avant de pouvoir l'activer sur ce tag.
            </p>
            <a 
              href="/settings/whatsapp" 
              className="text-sm text-blue-600 hover:underline mt-2 inline-block"
            >
              → Configurer WhatsApp
            </a>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {/* Video */}
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex items-center">
              <span className="text-2xl mr-3">📹</span>
              <div>
                <span className="font-medium">Appel Vidéo</span>
                <p className="text-xs text-gray-500">Visiteur peut vous appeler en vidéo</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={features.video || false}
              onChange={(e) => setFeatures(prev => ({ ...prev, video: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </label>

          {/* Audio */}
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🎤</span>
              <div>
                <span className="font-medium">Appel Audio</span>
                <p className="text-xs text-gray-500">Visiteur peut vous appeler</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={features.audio || false}
              onChange={(e) => setFeatures(prev => ({ ...prev, audio: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </label>

          {/* Message */}
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex items-center">
              <span className="text-2xl mr-3">💬</span>
              <div>
                <span className="font-medium">Message</span>
                <p className="text-xs text-gray-500">Visiteur peut envoyer un message texte</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={features.message || false}
              onChange={(e) => setFeatures(prev => ({ ...prev, message: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </label>

          {/* WhatsApp */}
          <label className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer ${
            whatsAppStatus?.verified ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
          }`}>
            <div className="flex items-center">
              <span className="text-2xl mr-3">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </span>
              <div>
                <span className="font-medium">WhatsApp Anonyme</span>
                <p className="text-xs text-gray-500">
                  {whatsAppStatus?.verified 
                    ? 'Visiteur peut vous contacter via WhatsApp (numéro masqué)'
                    : 'Validation WhatsApp requise dans les paramètres'
                  }
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={features.whatsapp || false}
              onChange={(e) => handleWhatsAppToggle(e.target.checked)}
              disabled={!whatsAppStatus?.verified}
              className="w-5 h-5 text-green-600 rounded"
            />
          </label>
        </div>

        {/* Geolocation Section */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Géolocalisation (Anti-fraude)
          </h3>

          {/* Use current position button */}
          <button
            onClick={handleGetCurrentPosition}
            disabled={isGettingLocation}
            className="w-full mb-3 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50 flex items-center justify-center"
          >
            {isGettingLocation ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Localisation en cours...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Utiliser ma position actuelle
              </>
            )}
          </button>

          {/* Latitude / Longitude inputs */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Latitude</label>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="34.052234"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Longitude</label>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="-6.783456"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          {/* Geofencing toggle */}
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🛡️</span>
              <div>
                <span className="font-medium text-sm">Protection géographique</span>
                <p className="text-xs text-gray-500">
                  Bloque les scans à plus de 100m du tag
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={geofencingEnabled}
              onChange={(e) => setGeofencingEnabled(e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded"
            />
          </label>

          {!latitude && !longitude && (
            <p className="text-xs text-yellow-600 mt-2">
              ⚠️ Aucune position configurée. La protection anti-fraude nécessite des coordonnées GPS.
            </p>
          )}
        </div>

        <div className="flex space-x-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
