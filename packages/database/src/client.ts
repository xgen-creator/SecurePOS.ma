import { PrismaClient } from '@prisma/client'

// Lazy initialization - pas de throw au top-level
let prismaInstance: PrismaClient | null = null

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      '❌ DATABASE_URL environment variable is required.\n' +
      'Set it to your Supabase PostgreSQL connection string:\n' +
      'postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres'
    )
  }
  return databaseUrl
}

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    const databaseUrl = getDatabaseUrl()
    
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    })
  }
  
  return prismaInstance
}

// Export legacy pour compatibilité (lazy)
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient()
    return (client as any)[prop]
  }
})

// Health check function
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy'
  latency: number
  error?: string
}> {
  const start = Date.now()
  try {
    const client = getPrismaClient()
    await client.$queryRaw`SELECT 1`
    return {
      status: 'healthy',
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Cleanup function for graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect()
  }
}

export * from '@prisma/client'
