import { createClient } from '@supabase/supabase-js'

// Types d'authentification
export interface AuthUser {
  id: string
  email: string
  role: 'ADMIN' | 'OWNER' | 'MANAGER' | 'VIEWER'
}

export interface Session {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
}

// Lazy initialization - pas de throw au top-level
function getEnvVars() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  return { supabaseUrl, supabaseServiceKey, supabaseAnonKey }
}

function validateEnv() {
  const { supabaseUrl, supabaseAnonKey } = getEnvVars()
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '❌ Supabase environment variables are required:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL\n' +
      '- NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }
}

// Client Supabase pour le serveur (lazy)
export function getSupabaseServer() {
  validateEnv()
  const { supabaseUrl, supabaseServiceKey } = getEnvVars()
  
  if (!supabaseServiceKey) {
    return null
  }
  
  return createClient(supabaseUrl!, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Client Supabase pour le client (lazy)
export function getSupabaseClient() {
  validateEnv()
  const { supabaseUrl, supabaseAnonKey } = getEnvVars()
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

// Clients legacy (pour compatibilité - ne pas utiliser)
export const supabaseServer = null as any
export const supabaseClient = null as any

// Validation de session avec Supabase uniquement
export async function validateSession(accessToken: string): Promise<AuthUser | null> {
  try {
    const client = getSupabaseClient()
    const { data: { user }, error } = await client.auth.getUser(accessToken)
    
    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email || '',
      role: (user.user_metadata?.role as AuthUser['role']) || 'VIEWER'
    }
  } catch {
    return null
  }
}

// Créer un utilisateur avec métadonnées
export async function createUser(
  email: string, 
  password: string,
  metadata: { name: string; role: string }
) {
  const server = getSupabaseServer()
  if (!server) {
    throw new Error('Server-side Supabase client not configured')
  }

  const { data, error } = await server.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`)
  }

  return data.user
}

// Middleware d'authentification pour API routes
export async function requireAuth(
  request: Request
): Promise<AuthUser> {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    throw new Error('Authentication required')
  }

  const user = await validateSession(token)
  
  if (!user) {
    throw new Error('Invalid or expired session')
  }

  return user
}

// Vérifier les permissions
export function requireRole(
  user: AuthUser, 
  allowedRoles: AuthUser['role'][]
): void {
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions')
  }
}
