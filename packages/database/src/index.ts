// Export principal du package database
export { prisma, checkDatabaseHealth, disconnectDatabase } from './client'
export * from '@prisma/client'

// Types Supabase auto-générés
export * from './supabase-types'

// Helpers types
export type DatabaseHealth = Awaited<ReturnType<typeof checkDatabaseHealth>>
